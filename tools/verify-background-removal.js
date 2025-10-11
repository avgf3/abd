#!/usr/bin/env node

/**
 * Background Removal Quality Verification Tool
 * Analyzes the processed images to verify transparency and quality
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

class BackgroundRemovalVerifier {
  constructor() {
    this.results = {
      total: 0,
      withTransparency: 0,
      withoutTransparency: 0,
      errors: 0,
      details: []
    };
  }

  /**
   * Analyze a single image for transparency and quality
   */
  async analyzeImage(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await sharp(imagePath).stats();
      
      // Check if image has alpha channel
      const hasAlpha = metadata.channels === 4 || metadata.hasAlpha;
      
      // Get file size
      const fileStats = await fs.stat(imagePath);
      
      // Analyze alpha channel if present
      let transparencyInfo = null;
      if (hasAlpha) {
        try {
          // Extract alpha channel
          const { data, info } = await sharp(imagePath)
            .extractChannel(3) // Alpha channel
            .raw()
            .toBuffer({ resolveWithObject: true });
          
          // Analyze alpha values
          const alphaValues = Array.from(data);
          const transparentPixels = alphaValues.filter(val => val === 0).length;
          const opaquePixels = alphaValues.filter(val => val === 255).length;
          const semiTransparentPixels = alphaValues.filter(val => val > 0 && val < 255).length;
          const totalPixels = alphaValues.length;
          
          transparencyInfo = {
            transparentPixels,
            opaquePixels,
            semiTransparentPixels,
            totalPixels,
            transparencyPercentage: (transparentPixels / totalPixels * 100).toFixed(2),
            semiTransparencyPercentage: (semiTransparentPixels / totalPixels * 100).toFixed(2)
          };
        } catch (error) {
          console.warn(`⚠️ Could not analyze alpha channel for ${path.basename(imagePath)}: ${error.message}`);
        }
      }
      
      return {
        file: path.basename(imagePath),
        path: imagePath,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        channels: metadata.channels,
        hasAlpha,
        fileSize: fileStats.size,
        fileSizeKB: Math.round(fileStats.size / 1024),
        transparency: transparencyInfo,
        quality: this.assessQuality(hasAlpha, transparencyInfo, metadata),
        success: true
      };
      
    } catch (error) {
      return {
        file: path.basename(imagePath),
        path: imagePath,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Assess the quality of background removal
   */
  assessQuality(hasAlpha, transparencyInfo, metadata) {
    if (!hasAlpha) {
      return {
        score: 0,
        grade: 'F',
        issues: ['No transparency detected - background removal may have failed']
      };
    }

    const issues = [];
    let score = 100;

    if (transparencyInfo) {
      // Check if there's meaningful transparency
      if (transparencyInfo.transparencyPercentage < 5) {
        issues.push('Very low transparency percentage - may not have removed background effectively');
        score -= 30;
      }

      // Check for good edge quality (semi-transparent pixels indicate smooth edges)
      if (transparencyInfo.semiTransparencyPercentage < 1) {
        issues.push('Low semi-transparency - edges may be too sharp');
        score -= 10;
      } else if (transparencyInfo.semiTransparencyPercentage > 20) {
        issues.push('High semi-transparency - may indicate poor edge detection');
        score -= 15;
      }

      // Check for reasonable balance
      if (transparencyInfo.opaquePixels < transparencyInfo.totalPixels * 0.1) {
        issues.push('Very few opaque pixels - subject may have been over-removed');
        score -= 20;
      }
    }

    // Determine grade
    let grade;
    if (score >= 90) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 80) grade = 'B+';
    else if (score >= 75) grade = 'B';
    else if (score >= 70) grade = 'C+';
    else if (score >= 65) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return {
      score: Math.max(0, score),
      grade,
      issues: issues.length > 0 ? issues : ['Good quality background removal']
    };
  }

  /**
   * Compare original and processed images
   */
  async compareImages(originalPath, processedPath) {
    try {
      const [originalStats, processedStats] = await Promise.all([
        fs.stat(originalPath),
        fs.stat(processedPath)
      ]);

      const [originalMeta, processedMeta] = await Promise.all([
        sharp(originalPath).metadata(),
        sharp(processedPath).metadata()
      ]);

      return {
        originalSize: originalStats.size,
        processedSize: processedStats.size,
        sizeChange: processedStats.size - originalStats.size,
        sizeChangePercent: ((processedStats.size - originalStats.size) / originalStats.size * 100).toFixed(2),
        dimensionsChanged: originalMeta.width !== processedMeta.width || originalMeta.height !== processedMeta.height,
        formatChanged: originalMeta.format !== processedMeta.format,
        channelsAdded: processedMeta.channels - originalMeta.channels
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Verify all processed images
   */
  async verifyDirectory(processedDir, originalDir = null) {
    console.log('🔍 Starting background removal verification...');
    console.log(`📁 Processed images: ${processedDir}`);
    if (originalDir) {
      console.log(`📁 Original images: ${originalDir}`);
    }

    // Get all image files
    const files = await fs.readdir(processedDir);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp|bmp|tiff)$/i.test(file)
    );

    if (imageFiles.length === 0) {
      console.log('❌ No image files found in processed directory');
      return;
    }

    console.log(`📊 Analyzing ${imageFiles.length} processed images...\n`);

    // Analyze each image
    for (const file of imageFiles) {
      const processedPath = path.join(processedDir, file);
      const analysis = await this.analyzeImage(processedPath);
      
      this.results.total++;
      
      if (analysis.success) {
        if (analysis.hasAlpha) {
          this.results.withTransparency++;
        } else {
          this.results.withoutTransparency++;
        }
        
        // Compare with original if available
        if (originalDir) {
          const originalPath = path.join(originalDir, file);
          try {
            const comparison = await this.compareImages(originalPath, processedPath);
            analysis.comparison = comparison;
          } catch (error) {
            // Original file might not exist or have different name
          }
        }
        
      } else {
        this.results.errors++;
      }
      
      this.results.details.push(analysis);
    }

    this.displayResults();
    return this.results;
  }

  /**
   * Display verification results
   */
  displayResults() {
    console.log('📊 Background Removal Verification Results');
    console.log('==========================================\n');

    // Summary statistics
    console.log('📈 Summary Statistics:');
    console.log(`   Total images analyzed: ${this.results.total}`);
    console.log(`   ✅ With transparency: ${this.results.withTransparency}`);
    console.log(`   ❌ Without transparency: ${this.results.withoutTransparency}`);
    console.log(`   🔥 Errors: ${this.results.errors}`);
    
    const successRate = ((this.results.withTransparency / this.results.total) * 100).toFixed(1);
    console.log(`   🎯 Success rate: ${successRate}%\n`);

    // Detailed results
    console.log('📋 Detailed Analysis:');
    console.log('─'.repeat(80));

    this.results.details.forEach(result => {
      if (result.success) {
        const status = result.hasAlpha ? '✅' : '❌';
        const grade = result.quality.grade;
        const score = result.quality.score;
        
        console.log(`${status} ${result.file}`);
        console.log(`   📐 Dimensions: ${result.width}x${result.height} (${result.format.toUpperCase()})`);
        console.log(`   💾 File size: ${result.fileSizeKB} KB`);
        console.log(`   📊 Quality: ${grade} (${score}/100)`);
        
        if (result.transparency) {
          console.log(`   🎭 Transparency: ${result.transparency.transparencyPercentage}% transparent`);
          console.log(`   🎨 Semi-transparent: ${result.transparency.semiTransparencyPercentage}% (edge smoothing)`);
        }
        
        if (result.comparison && !result.comparison.error) {
          const sizeChange = result.comparison.sizeChangePercent;
          const sizeIcon = sizeChange > 0 ? '📈' : '📉';
          console.log(`   ${sizeIcon} Size change: ${sizeChange}% (${result.comparison.channelsAdded} channels added)`);
        }
        
        if (result.quality.issues.length > 0) {
          console.log(`   💡 Notes: ${result.quality.issues[0]}`);
        }
        
      } else {
        console.log(`❌ ${result.file}: ${result.error}`);
      }
      
      console.log('');
    });

    // Overall assessment
    console.log('🎯 Overall Assessment:');
    if (successRate >= 95) {
      console.log('🏆 Excellent! Background removal was highly successful.');
    } else if (successRate >= 80) {
      console.log('👍 Good! Most images processed successfully.');
    } else if (successRate >= 60) {
      console.log('⚠️ Fair. Some images may need manual review.');
    } else {
      console.log('🔴 Poor. Background removal needs improvement.');
    }

    // Recommendations
    const avgGrade = this.calculateAverageGrade();
    console.log(`📊 Average quality grade: ${avgGrade}`);
    
    if (this.results.withoutTransparency > 0) {
      console.log('\n💡 Recommendations:');
      console.log('   • Review images without transparency');
      console.log('   • Consider using different AI models for failed images');
      console.log('   • Check if original images have complex backgrounds');
    }
  }

  /**
   * Calculate average quality grade
   */
  calculateAverageGrade() {
    const successfulResults = this.results.details.filter(r => r.success && r.quality);
    if (successfulResults.length === 0) return 'N/A';
    
    const avgScore = successfulResults.reduce((sum, r) => sum + r.quality.score, 0) / successfulResults.length;
    
    if (avgScore >= 90) return 'A+';
    else if (avgScore >= 85) return 'A';
    else if (avgScore >= 80) return 'B+';
    else if (avgScore >= 75) return 'B';
    else if (avgScore >= 70) return 'C+';
    else if (avgScore >= 65) return 'C';
    else if (avgScore >= 60) return 'D';
    else return 'F';
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
🔍 Background Removal Quality Verification Tool

Usage:
  node verify-background-removal.js <processed_dir> [original_dir]

Parameters:
  processed_dir - Directory containing processed images with removed backgrounds
  original_dir  - Optional: Directory containing original images for comparison

Examples:
  node verify-background-removal.js ./client/public/tags
  node verify-background-removal.js ./client/public/tags ./client/public/tags/backup_original
`);
    process.exit(1);
  }
  
  const [processedDir, originalDir] = args;
  const verifier = new BackgroundRemovalVerifier();
  
  try {
    await verifier.verifyDirectory(processedDir, originalDir);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
export { BackgroundRemovalVerifier };

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
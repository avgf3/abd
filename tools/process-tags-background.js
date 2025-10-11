#!/usr/bin/env node

/**
 * Specialized Tag Background Removal Tool
 * Optimized for tag images with design preservation
 */

import { AdvancedBackgroundRemover } from './advanced-background-removal.js';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

class TagBackgroundProcessor extends AdvancedBackgroundRemover {
  constructor() {
    // Use ultra quality for tag processing
    super('ultra');
    
    // Tag-specific configurations
    this.tagConfig = {
      preserveDesign: true,
      enhanceEdges: true,
      optimizeForTags: true,
      outputFormat: 'webp', // Keep original format
      quality: 95
    };
  }

  /**
   * Tag-specific preprocessing
   */
  async preprocessTagImage(inputBuffer) {
    console.log('🏷️ Applying tag-specific preprocessing...');
    
    // Analyze image to detect if it's a tag/badge design
    const metadata = await sharp(inputBuffer).metadata();
    
    let pipeline = sharp(inputBuffer);
    
    // Enhance contrast for better edge detection
    if (this.tagConfig.enhanceEdges) {
      pipeline = pipeline
        .sharpen({ sigma: 1.0, flat: 1.0, jagged: 2.0 })
        .modulate({ brightness: 1.05, saturation: 1.1 });
    }
    
    return await pipeline.toBuffer();
  }

  /**
   * Tag-specific post-processing
   */
  async postProcessTagImage(inputBuffer) {
    console.log('🎨 Applying tag-specific post-processing...');
    
    let pipeline = sharp(inputBuffer);
    
    // Preserve design elements
    if (this.tagConfig.preserveDesign) {
      // Apply minimal processing to preserve original design
      pipeline = pipeline
        .png({ quality: 100, compressionLevel: 6 })
        .withMetadata(); // Preserve metadata
    }
    
    // Convert to WebP for optimal web performance while maintaining quality
    if (this.tagConfig.outputFormat === 'webp') {
      pipeline = pipeline.webp({ 
        quality: this.tagConfig.quality,
        lossless: false,
        smartSubsample: true,
        effort: 6
      });
    }
    
    return await pipeline.toBuffer();
  }

  /**
   * Process tag with design preservation
   */
  async processTagImage(inputPath, outputPath) {
    console.log(`🏷️ Processing tag: ${path.basename(inputPath)}`);
    
    try {
      // Read and preprocess
      const inputBuffer = await fs.readFile(inputPath);
      const preprocessed = await this.preprocessTagImage(inputBuffer);
      
      // Remove background using hybrid approach
      const bgRemoved = await this.removeBackgroundHybrid(inputPath);
      
      // Apply tag-specific post-processing
      const finalBuffer = await this.postProcessTagImage(bgRemoved);
      
      // Save result
      await fs.writeFile(outputPath, finalBuffer);
      
      // Verify result quality
      const outputMetadata = await sharp(finalBuffer).metadata();
      console.log(`✅ Tag processed successfully: ${outputMetadata.width}x${outputMetadata.height}, ${outputMetadata.format}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to process tag ${path.basename(inputPath)}:`, error.message);
      return false;
    }
  }

  /**
   * Process all tags with backup preservation
   */
  async processAllTags(tagsDir, backupDir) {
    console.log('🚀 Starting comprehensive tag background removal...');
    console.log(`📁 Tags directory: ${tagsDir}`);
    console.log(`📁 Backup directory: ${backupDir}`);
    
    // Ensure directories exist
    await fs.mkdir(tagsDir, { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });
    
    // Get all tag files from backup (original files)
    const backupFiles = await fs.readdir(backupDir);
    const tagFiles = backupFiles.filter(file => 
      /\.(jpg|jpeg|png|webp|bmp|tiff)$/i.test(file)
    );
    
    if (tagFiles.length === 0) {
      console.log('❌ No tag files found in backup directory');
      return;
    }
    
    console.log(`📊 Found ${tagFiles.length} tag files to process`);
    
    const results = { success: 0, failed: 0, skipped: 0 };
    
    // Process each tag
    for (const file of tagFiles) {
      const backupPath = path.join(backupDir, file);
      const outputPath = path.join(tagsDir, file);
      
      try {
        // Check if output already exists and is newer
        const backupStat = await fs.stat(backupPath);
        let shouldProcess = true;
        
        try {
          const outputStat = await fs.stat(outputPath);
          if (outputStat.mtime > backupStat.mtime) {
            console.log(`⏭️ Skipping ${file} (already processed and up to date)`);
            results.skipped++;
            shouldProcess = false;
          }
        } catch {
          // Output doesn't exist, should process
        }
        
        if (shouldProcess) {
          const success = await this.processTagImage(backupPath, outputPath);
          if (success) {
            results.success++;
          } else {
            results.failed++;
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
        results.failed++;
      }
    }
    
    console.log(`\n🎉 Tag processing complete!`);
    console.log(`✅ Successfully processed: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️ Skipped (up to date): ${results.skipped}`);
    
    return results;
  }

  /**
   * Verify background removal quality
   */
  async verifyResults(tagsDir) {
    console.log('🔍 Verifying background removal quality...');
    
    const files = await fs.readdir(tagsDir);
    const tagFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp|bmp|tiff)$/i.test(file)
    );
    
    const verificationResults = [];
    
    for (const file of tagFiles) {
      const filePath = path.join(tagsDir, file);
      
      try {
        const metadata = await sharp(filePath).metadata();
        const hasAlpha = metadata.channels === 4 || metadata.hasAlpha;
        
        // Get image statistics
        const stats = await sharp(filePath).stats();
        
        verificationResults.push({
          file,
          hasTransparency: hasAlpha,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: metadata.size,
          quality: hasAlpha ? 'Good' : 'Needs Review'
        });
        
      } catch (error) {
        verificationResults.push({
          file,
          error: error.message,
          quality: 'Error'
        });
      }
    }
    
    // Display results
    console.log('\n📊 Quality Verification Results:');
    console.log('================================');
    
    verificationResults.forEach(result => {
      if (result.error) {
        console.log(`❌ ${result.file}: ${result.error}`);
      } else {
        const status = result.hasTransparency ? '✅' : '⚠️';
        console.log(`${status} ${result.file}: ${result.width}x${result.height} ${result.format.toUpperCase()} - ${result.quality}`);
      }
    });
    
    const goodQuality = verificationResults.filter(r => r.quality === 'Good').length;
    const needsReview = verificationResults.filter(r => r.quality === 'Needs Review').length;
    const errors = verificationResults.filter(r => r.quality === 'Error').length;
    
    console.log(`\n📈 Summary:`);
    console.log(`✅ Good quality: ${goodQuality}`);
    console.log(`⚠️ Needs review: ${needsReview}`);
    console.log(`❌ Errors: ${errors}`);
    
    return verificationResults;
  }
}

// Main execution
async function main() {
  const processor = new TagBackgroundProcessor();
  
  // Define paths
  const tagsDir = path.join(process.cwd(), 'client/public/tags');
  const backupDir = path.join(tagsDir, 'backup_original');
  
  console.log('🎨 Advanced Tag Background Removal System');
  console.log('==========================================');
  
  try {
    // Process all tags
    const results = await processor.processAllTags(tagsDir, backupDir);
    
    // Verify results
    if (results.success > 0) {
      console.log('\n🔍 Running quality verification...');
      await processor.verifyResults(tagsDir);
    }
    
    console.log('\n🎉 All operations completed successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TagBackgroundProcessor };
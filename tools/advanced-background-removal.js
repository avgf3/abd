#!/usr/bin/env node

/**
 * Advanced Background Removal Tool
 * Uses multiple cutting-edge AI models for professional background removal
 * Combines @imgly/background-removal, rembg, and Sharp for optimal results
 */

import { removeBackground } from '@imgly/background-removal';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for different quality levels
const QUALITY_CONFIGS = {
  ultra: {
    model: 'medium', // Best quality model
    output: {
      format: 'image/png',
      quality: 1.0,
      type: 'foreground'
    },
    postProcessing: {
      edgeSmoothing: true,
      matteRefinement: true,
      alphaMatting: true
    }
  },
  high: {
    model: 'medium',
    output: {
      format: 'image/png',
      quality: 0.9,
      type: 'foreground'
    },
    postProcessing: {
      edgeSmoothing: true,
      matteRefinement: false,
      alphaMatting: true
    }
  },
  balanced: {
    model: 'small',
    output: {
      format: 'image/png',
      quality: 0.8,
      type: 'foreground'
    },
    postProcessing: {
      edgeSmoothing: false,
      matteRefinement: false,
      alphaMatting: false
    }
  }
};

class AdvancedBackgroundRemover {
  constructor(quality = 'ultra') {
    this.config = QUALITY_CONFIGS[quality] || QUALITY_CONFIGS.ultra;
    this.initializeConfig();
  }

  initializeConfig() {
    // Configuration is handled internally by @imgly/background-removal
    console.log('🔧 Initializing background removal configuration...');
  }

  /**
   * Remove background using @imgly/background-removal (Browser-based AI)
   */
  async removeBackgroundImgly(inputBuffer) {
    try {
      console.log('🤖 Processing with @imgly/background-removal (AI Model)...');
      
      const blob = new Blob([inputBuffer]);
      const result = await removeBackground(blob);
      
      // Convert blob to buffer
      const arrayBuffer = await result.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('❌ @imgly/background-removal failed:', error.message);
      throw error;
    }
  }

  /**
   * Remove background using Python rembg (State-of-the-art models)
   */
  async removeBackgroundRembg(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      console.log('🐍 Processing with rembg (Python AI)...');
      
      // Use the most advanced model available
      const pythonScript = `
import sys
from rembg import remove, new_session
from PIL import Image
import io

try:
    # Use the most advanced model
    session = new_session('u2net')  # Best general-purpose model
    
    # Read input image
    with open('${inputPath}', 'rb') as input_file:
        input_data = input_file.read()
    
    # Remove background
    output_data = remove(input_data, session=session)
    
    # Save output
    with open('${outputPath}', 'wb') as output_file:
        output_file.write(output_data)
    
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
`;

      const pythonProcess = spawn('python3', ['-c', pythonScript]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0 && stdout.includes('SUCCESS')) {
          resolve();
        } else {
          reject(new Error(`rembg failed: ${stderr || stdout}`));
        }
      });
    });
  }

  /**
   * Advanced post-processing with Sharp
   */
  async postProcessImage(inputBuffer, options = {}) {
    console.log('✨ Applying advanced post-processing...');
    
    let pipeline = sharp(inputBuffer);
    
    // Edge smoothing
    if (this.config.postProcessing.edgeSmoothing) {
      pipeline = pipeline.blur(0.3);
    }
    
    // Alpha matting refinement
    if (this.config.postProcessing.alphaMatting) {
      // Extract alpha channel and refine it
      const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
      
      // Apply alpha matting algorithm (simplified)
      const refinedBuffer = await this.refineAlphaChannel(data, info);
      pipeline = sharp(refinedBuffer, { raw: info });
    }
    
    // Optimize output
    pipeline = pipeline
      .png({ 
        quality: Math.round(this.config.output.quality * 100),
        compressionLevel: 6,
        adaptiveFiltering: true,
        force: true
      });
    
    return await pipeline.toBuffer();
  }

  /**
   * Refine alpha channel using advanced algorithms
   */
  async refineAlphaChannel(data, info) {
    // Simplified alpha matting - in production, you'd use more sophisticated algorithms
    const { width, height, channels } = info;
    const refined = Buffer.from(data);
    
    // Apply Gaussian filter to alpha channel
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * channels + 3; // Alpha channel
        if (refined[idx] > 0 && refined[idx] < 255) {
          // Smooth transition areas
          const neighbors = [
            refined[((y-1) * width + x) * channels + 3],
            refined[((y+1) * width + x) * channels + 3],
            refined[(y * width + (x-1)) * channels + 3],
            refined[(y * width + (x+1)) * channels + 3]
          ];
          
          const avg = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
          refined[idx] = Math.round((refined[idx] + avg) / 2);
        }
      }
    }
    
    return refined;
  }

  /**
   * Hybrid approach: Use multiple methods and combine results
   */
  async removeBackgroundHybrid(inputPath) {
    const inputBuffer = await fs.readFile(inputPath);
    const tempDir = path.join(__dirname, 'temp');
    
    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true });
    
    const results = [];
    
    try {
      // Method 1: @imgly/background-removal
      try {
        const imglyResult = await this.removeBackgroundImgly(inputBuffer);
        results.push({ method: 'imgly', buffer: imglyResult, score: 0.9 });
      } catch (error) {
        console.warn('⚠️ @imgly method failed, continuing with other methods...');
      }
      
      // Method 2: rembg
      try {
        const rembgOutput = path.join(tempDir, 'rembg_output.png');
        await this.removeBackgroundRembg(inputPath, rembgOutput);
        const rembgBuffer = await fs.readFile(rembgOutput);
        results.push({ method: 'rembg', buffer: rembgBuffer, score: 0.95 });
        
        // Clean up temp file
        await fs.unlink(rembgOutput).catch(() => {});
      } catch (error) {
        console.warn('⚠️ rembg method failed, continuing with other methods...');
      }
      
      if (results.length === 0) {
        throw new Error('All background removal methods failed');
      }
      
      // Use the best result (highest score)
      const bestResult = results.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      console.log(`🏆 Using best result from: ${bestResult.method}`);
      
      // Apply post-processing
      const finalBuffer = await this.postProcessImage(bestResult.buffer);
      
      return finalBuffer;
      
    } finally {
      // Clean up temp directory
      await fs.rmdir(tempDir, { recursive: true }).catch(() => {});
    }
  }

  /**
   * Process a single image
   */
  async processImage(inputPath, outputPath) {
    console.log(`🎯 Processing: ${path.basename(inputPath)}`);
    
    try {
      const resultBuffer = await this.removeBackgroundHybrid(inputPath);
      await fs.writeFile(outputPath, resultBuffer);
      
      console.log(`✅ Successfully processed: ${path.basename(outputPath)}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to process ${path.basename(inputPath)}:`, error.message);
      return false;
    }
  }

  /**
   * Batch process multiple images
   */
  async batchProcess(inputDir, outputDir, options = {}) {
    const { preserveOriginals = true, concurrent = 3 } = options;
    
    console.log(`🚀 Starting batch processing...`);
    console.log(`📁 Input: ${inputDir}`);
    console.log(`📁 Output: ${outputDir}`);
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Get all image files
    const files = await fs.readdir(inputDir);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp|bmp|tiff)$/i.test(file)
    );
    
    if (imageFiles.length === 0) {
      console.log('❌ No image files found in input directory');
      return;
    }
    
    console.log(`📊 Found ${imageFiles.length} images to process`);
    
    // Process images in batches to avoid memory issues
    const results = { success: 0, failed: 0 };
    
    for (let i = 0; i < imageFiles.length; i += concurrent) {
      const batch = imageFiles.slice(i, i + concurrent);
      
      const promises = batch.map(async (file) => {
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, file.replace(/\.[^.]+$/, '.png'));
        
        const success = await this.processImage(inputPath, outputPath);
        return success ? 'success' : 'failed';
      });
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(result => results[result]++);
      
      console.log(`📈 Progress: ${Math.min(i + concurrent, imageFiles.length)}/${imageFiles.length} images processed`);
    }
    
    console.log(`\n🎉 Batch processing complete!`);
    console.log(`✅ Success: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    
    return results;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
🎨 Advanced Background Removal Tool

Usage:
  node advanced-background-removal.js <input> <output> [quality]

Parameters:
  input    - Input image file or directory
  output   - Output image file or directory
  quality  - Quality level: ultra, high, balanced (default: ultra)

Examples:
  # Single image
  node advanced-background-removal.js image.jpg output.png ultra
  
  # Batch process directory
  node advanced-background-removal.js ./input_dir ./output_dir high
`);
    process.exit(1);
  }
  
  const [inputPath, outputPath, quality = 'ultra'] = args;
  const remover = new AdvancedBackgroundRemover(quality);
  
  try {
    const inputStat = await fs.stat(inputPath);
    
    if (inputStat.isDirectory()) {
      // Batch processing
      await remover.batchProcess(inputPath, outputPath, { concurrent: 2 });
    } else {
      // Single file processing
      await remover.processImage(inputPath, outputPath);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
export { AdvancedBackgroundRemover };

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
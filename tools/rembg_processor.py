#!/usr/bin/env python3
"""
Advanced Background Removal using rembg
Utilizes the most powerful AI models for professional results
"""

import os
import sys
import argparse
from pathlib import Path
import time
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
from rembg import remove, new_session
import cv2

class AdvancedRembgProcessor:
    """Advanced background removal processor using multiple rembg models"""
    
    # Available models ranked by quality and use case
    MODELS = {
        'u2net': 'Best general-purpose model',
        'u2net_human_seg': 'Optimized for human subjects',
        'u2netp': 'Lightweight version of u2net',
        'silueta': 'Good for objects and logos',
        'isnet-general-use': 'Latest general-purpose model',
        'sam': 'Segment Anything Model (most advanced)',
    }
    
    def __init__(self, model='u2net', quality='ultra'):
        self.model_name = model
        self.quality = quality
        self.session = None
        self.initialize_model()
        
    def initialize_model(self):
        """Initialize the rembg model session"""
        try:
            print(f"🤖 Initializing {self.model_name} model...")
            self.session = new_session(self.model_name)
            print(f"✅ Model {self.model_name} loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load model {self.model_name}: {e}")
            # Fallback to u2net
            if self.model_name != 'u2net':
                print("🔄 Falling back to u2net model...")
                self.model_name = 'u2net'
                self.session = new_session('u2net')
    
    def preprocess_image(self, image_path):
        """Preprocess image for better background removal"""
        print(f"🔧 Preprocessing image: {Path(image_path).name}")
        
        # Load image
        img = Image.open(image_path)
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Enhance image for better processing
        if self.quality in ['ultra', 'high']:
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.2)
            
            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(1.1)
            
            # Apply slight blur to reduce noise
            img = img.filter(ImageFilter.GaussianBlur(radius=0.5))
        
        return img
    
    def postprocess_image(self, img):
        """Apply post-processing to improve results"""
        print("✨ Applying post-processing...")
        
        # Convert to numpy array for advanced processing
        img_array = np.array(img)
        
        if img_array.shape[2] == 4:  # RGBA
            # Refine alpha channel
            alpha = img_array[:, :, 3]
            
            if self.quality == 'ultra':
                # Apply morphological operations to clean up alpha
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
                alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, kernel)
                alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, kernel)
                
                # Apply Gaussian blur to smooth edges
                alpha = cv2.GaussianBlur(alpha, (3, 3), 0.5)
            
            # Update alpha channel
            img_array[:, :, 3] = alpha
            
            # Convert back to PIL Image
            img = Image.fromarray(img_array, 'RGBA')
        
        return img
    
    def remove_background(self, input_path, output_path):
        """Remove background from a single image"""
        try:
            print(f"🎯 Processing: {Path(input_path).name}")
            
            # Preprocess image
            img = self.preprocess_image(input_path)
            
            # Convert to bytes for rembg
            import io
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes = img_bytes.getvalue()
            
            # Remove background
            print(f"🤖 Removing background with {self.model_name}...")
            start_time = time.time()
            
            output_bytes = remove(img_bytes, session=self.session)
            
            processing_time = time.time() - start_time
            print(f"⏱️ Processing completed in {processing_time:.2f} seconds")
            
            # Load result and post-process
            result_img = Image.open(io.BytesIO(output_bytes))
            result_img = self.postprocess_image(result_img)
            
            # Save result
            result_img.save(output_path, format='PNG', optimize=True)
            
            print(f"✅ Saved: {Path(output_path).name}")
            return True
            
        except Exception as e:
            print(f"❌ Error processing {Path(input_path).name}: {e}")
            return False
    
    def batch_process(self, input_dir, output_dir):
        """Process all images in a directory"""
        input_path = Path(input_dir)
        output_path = Path(output_dir)
        
        # Create output directory
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Find all image files
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}
        image_files = [f for f in input_path.iterdir() 
                      if f.suffix.lower() in image_extensions]
        
        if not image_files:
            print("❌ No image files found in input directory")
            return
        
        print(f"📊 Found {len(image_files)} images to process")
        
        results = {'success': 0, 'failed': 0}
        
        for i, img_file in enumerate(image_files, 1):
            print(f"\n📈 Progress: {i}/{len(image_files)}")
            
            output_file = output_path / f"{img_file.stem}.png"
            
            success = self.remove_background(str(img_file), str(output_file))
            if success:
                results['success'] += 1
            else:
                results['failed'] += 1
        
        print(f"\n🎉 Batch processing complete!")
        print(f"✅ Success: {results['success']}")
        print(f"❌ Failed: {results['failed']}")
        
        return results
    
    def compare_models(self, input_path, output_dir):
        """Compare results from different models"""
        print(f"🔬 Comparing models for: {Path(input_path).name}")
        
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        results = {}
        
        for model_name, description in self.MODELS.items():
            try:
                print(f"\n🧪 Testing {model_name}: {description}")
                
                # Initialize model
                session = new_session(model_name)
                
                # Process image
                with open(input_path, 'rb') as f:
                    input_bytes = f.read()
                
                start_time = time.time()
                output_bytes = remove(input_bytes, session=session)
                processing_time = time.time() - start_time
                
                # Save result
                output_file = output_path / f"{Path(input_path).stem}_{model_name}.png"
                with open(output_file, 'wb') as f:
                    f.write(output_bytes)
                
                results[model_name] = {
                    'success': True,
                    'time': processing_time,
                    'file': str(output_file)
                }
                
                print(f"✅ {model_name}: {processing_time:.2f}s")
                
            except Exception as e:
                print(f"❌ {model_name} failed: {e}")
                results[model_name] = {
                    'success': False,
                    'error': str(e)
                }
        
        print(f"\n📊 Model comparison complete!")
        return results

def main():
    parser = argparse.ArgumentParser(description='Advanced Background Removal using rembg')
    parser.add_argument('input', help='Input image file or directory')
    parser.add_argument('output', help='Output image file or directory')
    parser.add_argument('--model', default='u2net', choices=list(AdvancedRembgProcessor.MODELS.keys()),
                       help='Model to use for background removal')
    parser.add_argument('--quality', default='ultra', choices=['ultra', 'high', 'balanced'],
                       help='Processing quality level')
    parser.add_argument('--compare', action='store_true',
                       help='Compare results from all available models')
    
    args = parser.parse_args()
    
    processor = AdvancedRembgProcessor(model=args.model, quality=args.quality)
    
    input_path = Path(args.input)
    output_path = Path(args.output)
    
    if args.compare:
        # Model comparison mode
        if input_path.is_file():
            processor.compare_models(str(input_path), str(output_path))
        else:
            print("❌ Model comparison only works with single files")
            return
    
    elif input_path.is_file():
        # Single file processing
        processor.remove_background(str(input_path), str(output_path))
    
    elif input_path.is_dir():
        # Batch processing
        processor.batch_process(str(input_path), str(output_path))
    
    else:
        print(f"❌ Input path does not exist: {input_path}")

if __name__ == '__main__':
    main()
#!/usr/bin/env python3
"""
Gentle Background Removal System
Preserves designs while removing backgrounds carefully
Uses conservative settings to maintain all design elements
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from pathlib import Path
import argparse
from rembg import remove, new_session
import time

class GentleBackgroundRemover:
    """Gentle background removal that preserves all design elements"""
    
    def __init__(self):
        self.session = None
        self.initialize_model()
    
    def initialize_model(self):
        """Initialize the most conservative model"""
        try:
            print("🤖 Initializing gentle U2Net model...")
            # Use u2net as it's most reliable for preserving subjects
            self.session = new_session('u2net')
            print("✅ Gentle model loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            sys.exit(1)
    
    def analyze_image_content(self, image_path):
        """Analyze image to determine the best approach"""
        print(f"🔍 Analyzing content: {Path(image_path).name}")
        
        img = Image.open(image_path).convert('RGB')
        img_array = np.array(img)
        
        # Calculate image statistics
        height, width = img_array.shape[:2]
        total_pixels = height * width
        
        # Convert to HSV for better analysis
        hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
        
        # Analyze color diversity
        unique_colors = len(np.unique(img_array.reshape(-1, 3), axis=0))
        color_diversity = unique_colors / total_pixels
        
        # Analyze saturation (colorfulness)
        saturation = hsv[:, :, 1]
        avg_saturation = np.mean(saturation)
        
        # Analyze brightness distribution
        brightness = hsv[:, :, 2]
        avg_brightness = np.mean(brightness)
        
        # Detect edges (complexity)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / total_pixels
        
        analysis = {
            'width': width,
            'height': height,
            'color_diversity': color_diversity,
            'avg_saturation': avg_saturation,
            'avg_brightness': avg_brightness,
            'edge_density': edge_density,
            'complexity': 'high' if edge_density > 0.1 else 'medium' if edge_density > 0.05 else 'low'
        }
        
        print(f"   📊 Complexity: {analysis['complexity']}")
        print(f"   🎨 Color diversity: {color_diversity:.4f}")
        print(f"   💡 Avg brightness: {avg_brightness:.1f}")
        print(f"   🌈 Avg saturation: {avg_saturation:.1f}")
        
        return analysis
    
    def gentle_background_removal(self, image_path):
        """Apply gentle background removal"""
        print(f"🎯 Gentle processing: {Path(image_path).name}")
        
        try:
            # Read original image
            with open(image_path, 'rb') as f:
                input_data = f.read()
            
            # Apply background removal with original model
            print("   🤖 Applying gentle AI background removal...")
            start_time = time.time()
            output_data = remove(input_data, session=self.session)
            processing_time = time.time() - start_time
            
            # Load result
            result_img = Image.open(io.BytesIO(output_data)).convert('RGBA')
            
            print(f"   ⏱️ Processed in {processing_time:.2f} seconds")
            
            return result_img
            
        except Exception as e:
            print(f"   ❌ Gentle processing failed: {e}")
            return None
    
    def conservative_cleanup(self, img):
        """Apply very conservative cleanup to preserve designs"""
        print("   🧹 Applying conservative cleanup...")
        
        img_array = np.array(img)
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Very conservative threshold - only remove clearly transparent pixels
        # Keep more semi-transparent pixels to preserve design edges
        threshold = 50  # Much lower threshold than aggressive cleanup
        
        # Only make pixels with very low alpha completely transparent
        alpha[alpha < threshold] = 0
        
        # Apply minimal morphological cleanup
        alpha_binary = (alpha > 0).astype(np.uint8)
        
        # Very small kernel to preserve details
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        
        # Only remove very small noise
        alpha_binary = cv2.morphologyEx(alpha_binary, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Fill only very small holes
        alpha_binary = cv2.morphologyEx(alpha_binary, cv2.MORPH_CLOSE, kernel, iterations=1)
        
        # Convert back to alpha values
        alpha_cleaned = alpha_binary.astype(np.float32) * 255
        
        # Preserve original alpha values for non-zero pixels
        mask = alpha_binary > 0
        alpha_cleaned[mask] = alpha[mask]
        
        # Apply very light gaussian blur for smooth edges
        alpha_cleaned = cv2.GaussianBlur(alpha_cleaned, (3, 3), 0.3)
        
        # Update alpha channel
        img_array[:, :, 3] = alpha_cleaned.astype(np.uint8)
        
        return Image.fromarray(img_array, 'RGBA')
    
    def preserve_design_elements(self, original_img, processed_img):
        """Ensure important design elements are preserved"""
        print("   🎨 Preserving design elements...")
        
        # Convert to arrays
        original_array = np.array(original_img.convert('RGBA'))
        processed_array = np.array(processed_img)
        
        # Create a mask for areas that might be important design elements
        # Look for high contrast areas in the original
        original_gray = cv2.cvtColor(original_array[:, :, :3], cv2.COLOR_RGB2GRAY)
        
        # Detect edges in original (potential design elements)
        edges = cv2.Canny(original_gray, 30, 100)
        
        # Dilate edges to create protection zones
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        protected_areas = cv2.dilate(edges, kernel, iterations=2)
        
        # In protected areas, be more conservative with transparency
        protected_mask = protected_areas > 0
        
        # For protected areas, ensure minimum alpha value
        min_alpha_protected = 100  # Minimum alpha for protected design areas
        
        alpha_channel = processed_array[:, :, 3]
        alpha_channel[protected_mask & (alpha_channel > 0)] = np.maximum(
            alpha_channel[protected_mask & (alpha_channel > 0)], 
            min_alpha_protected
        )
        
        processed_array[:, :, 3] = alpha_channel
        
        return Image.fromarray(processed_array, 'RGBA')
    
    def process_image_gently(self, input_path, output_path):
        """Complete gentle processing pipeline"""
        print(f"\n🌸 Gentle processing: {Path(input_path).name}")
        
        try:
            # Step 1: Analyze image content
            analysis = self.analyze_image_content(input_path)
            
            # Step 2: Apply gentle background removal
            processed_img = self.gentle_background_removal(input_path)
            
            if processed_img is None:
                print(f"❌ Failed to process {Path(input_path).name}")
                return False
            
            # Step 3: Apply conservative cleanup
            cleaned_img = self.conservative_cleanup(processed_img)
            
            # Step 4: Preserve design elements
            original_img = Image.open(input_path)
            final_img = self.preserve_design_elements(original_img, cleaned_img)
            
            # Step 5: Save with high quality
            final_img.save(output_path, format='WebP', quality=95, method=6)
            
            # Step 6: Verify result
            final_analysis = self.analyze_result(final_img)
            print(f"   📈 Result: {final_analysis['transparent_percent']:.1f}% transparent, {final_analysis['preserved_percent']:.1f}% design preserved")
            
            print(f"   ✅ Saved: {Path(output_path).name}")
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to process {Path(input_path).name}: {e}")
            return False
    
    def analyze_result(self, img):
        """Analyze the final result"""
        img_array = np.array(img)
        alpha = img_array[:, :, 3]
        
        total_pixels = alpha.size
        transparent = np.sum(alpha == 0)
        semi_transparent = np.sum((alpha > 0) & (alpha < 255))
        opaque = np.sum(alpha == 255)
        
        return {
            'transparent_percent': (transparent / total_pixels) * 100,
            'semi_transparent_percent': (semi_transparent / total_pixels) * 100,
            'opaque_percent': (opaque / total_pixels) * 100,
            'preserved_percent': ((semi_transparent + opaque) / total_pixels) * 100
        }
    
    def batch_process_gently(self, input_dir, output_dir):
        """Process all images with gentle approach"""
        print("🌸 Starting gentle batch processing...")
        print("🎯 Priority: Preserve ALL design elements")
        
        input_path = Path(input_dir)
        output_path = Path(output_dir)
        
        # Find all image files
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}
        image_files = [f for f in input_path.iterdir() 
                      if f.suffix.lower() in image_extensions]
        
        if not image_files:
            print("❌ No image files found")
            return
        
        print(f"📊 Found {len(image_files)} images to process gently")
        
        results = {'success': 0, 'failed': 0, 'preserved': []}
        
        for i, img_file in enumerate(image_files, 1):
            print(f"\n📈 Progress: {i}/{len(image_files)}")
            
            # Skip if it's the backup directory
            if 'backup' in str(img_file):
                continue
            
            output_file = output_path / img_file.name
            
            success = self.process_image_gently(str(img_file), str(output_file))
            
            if success:
                results['success'] += 1
                results['preserved'].append(img_file.name)
            else:
                results['failed'] += 1
        
        print(f"\n🌸 Gentle processing complete!")
        print(f"✅ Successfully processed: {results['success']}")
        print(f"❌ Failed: {results['failed']}")
        print(f"🎨 Design-preserved files: {len(results['preserved'])}")
        
        if results['preserved']:
            print("📋 Preserved designs:")
            for filename in results['preserved']:
                print(f"   ✅ {filename}")
        
        return results

# Add missing import
import io

def main():
    parser = argparse.ArgumentParser(description='Gentle Background Removal System')
    parser.add_argument('input', help='Input directory with images')
    parser.add_argument('output', help='Output directory for processed images')
    
    args = parser.parse_args()
    
    remover = GentleBackgroundRemover()
    remover.batch_process_gently(args.input, args.output)

if __name__ == '__main__':
    main()
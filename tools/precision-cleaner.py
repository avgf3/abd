#!/usr/bin/env python3
"""
Precision Background Cleaner
Ultra-careful cleaning that preserves every design detail
Removes only background while keeping ALL design elements intact
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from pathlib import Path
import argparse
from rembg import remove, new_session

class PrecisionBackgroundCleaner:
    """Ultra-precise cleaning that preserves every design detail"""
    
    def __init__(self):
        self.session = None
        self.initialize_model()
    
    def initialize_model(self):
        """Initialize the most conservative model"""
        try:
            print("🎯 Initializing precision U2Net model...")
            self.session = new_session('u2net')
            print("✅ Precision model loaded")
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            sys.exit(1)
    
    def analyze_design_elements(self, img_array):
        """Carefully analyze and identify all design elements"""
        print("   🔍 Analyzing design elements...")
        
        rgb = img_array[:, :, :3]
        alpha = img_array[:, :, 3] if img_array.shape[2] == 4 else np.ones(rgb.shape[:2], dtype=np.uint8) * 255
        
        # Convert to different color spaces for analysis
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
        
        # Identify design elements by color characteristics
        # High saturation areas (likely design elements)
        high_saturation = hsv[:, :, 1] > 30
        
        # Areas with distinct colors (not grayish)
        color_variance = np.std(rgb, axis=2)
        distinct_colors = color_variance > 10
        
        # Edge-rich areas (text, logos, details)
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 30, 100)
        edge_regions = cv2.dilate(edges, np.ones((3,3), np.uint8), iterations=1)
        
        # Combine all design indicators
        design_mask = high_saturation | distinct_colors | (edge_regions > 0)
        
        # Clean up the mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        design_mask = cv2.morphologyEx(design_mask.astype(np.uint8), cv2.MORPH_CLOSE, kernel)
        
        design_pixels = np.sum(design_mask)
        print(f"      - Identified {design_pixels} design element pixels")
        
        return design_mask.astype(bool)
    
    def gentle_background_removal(self, input_path):
        """Apply very gentle background removal"""
        print("   🌸 Applying gentle background removal...")
        
        with open(input_path, 'rb') as f:
            input_data = f.read()
        
        # Use rembg with default settings (most conservative)
        start_time = time.time()
        output_data = remove(input_data, session=self.session)
        processing_time = time.time() - start_time
        
        # Load result
        import io
        result_img = Image.open(io.BytesIO(output_data)).convert('RGBA')
        
        print(f"      - Processed in {processing_time:.2f}s")
        return result_img
    
    def preserve_design_details(self, original_array, processed_array, design_mask):
        """Preserve all design details identified in the mask"""
        print("   🎨 Preserving design details...")
        
        # In design areas, be extremely conservative
        design_coords = np.where(design_mask)
        
        if len(design_coords[0]) > 0:
            # For design areas, ensure minimum alpha
            min_alpha_design = 150  # High minimum for design elements
            
            processed_alpha = processed_array[:, :, 3]
            
            # Ensure design areas have strong alpha
            design_alpha = processed_alpha[design_coords]
            weak_design = design_alpha < min_alpha_design
            
            if np.any(weak_design):
                # Restore alpha for weak design areas
                weak_coords = (design_coords[0][weak_design], design_coords[1][weak_design])
                processed_alpha[weak_coords] = np.maximum(
                    processed_alpha[weak_coords], 
                    min_alpha_design
                )
                
                print(f"      - Restored {np.sum(weak_design)} weak design pixels")
            
            # Also preserve original colors in design areas if they were changed significantly
            original_rgb = original_array[:, :, :3]
            processed_rgb = processed_array[:, :, :3]
            
            # Calculate color difference
            color_diff = np.sum(np.abs(original_rgb.astype(np.int16) - processed_rgb.astype(np.int16)), axis=2)
            significant_change = color_diff > 30
            
            # Restore original colors where there's significant change in design areas
            restore_mask = design_mask & significant_change
            restore_coords = np.where(restore_mask)
            
            if len(restore_coords[0]) > 0:
                processed_rgb[restore_coords] = original_rgb[restore_coords]
                print(f"      - Restored colors for {len(restore_coords[0])} design pixels")
        
        processed_array[:, :, 3] = processed_alpha
        return processed_array
    
    def minimal_cleanup(self, img_array, design_mask):
        """Apply minimal cleanup while protecting design elements"""
        print("   🧹 Applying minimal cleanup...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Only clean areas that are NOT design elements
        cleanup_mask = ~design_mask
        
        # Very conservative threshold only for non-design areas
        threshold = 30  # Very low threshold
        
        # Apply threshold only to non-design areas
        cleanup_coords = np.where(cleanup_mask & (alpha > 0) & (alpha < threshold))
        
        if len(cleanup_coords[0]) > 0:
            alpha[cleanup_coords] = 0
            print(f"      - Cleaned {len(cleanup_coords[0])} non-design pixels")
        
        # Remove only very obvious isolated noise (tiny specs)
        binary_mask = (alpha > 0).astype(np.uint8)
        
        # Very small kernel to avoid removing design details
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        opened = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Only remove isolated pixels that are not in design areas
        isolated = binary_mask - opened
        isolated_non_design = isolated & (~design_mask.astype(np.uint8))
        
        isolated_coords = np.where(isolated_non_design > 0)
        if len(isolated_coords[0]) > 0:
            alpha[isolated_coords] = 0
            print(f"      - Removed {len(isolated_coords[0])} isolated non-design pixels")
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def precision_clean_image(self, input_path, output_path):
        """Apply precision cleaning to preserve all design elements"""
        print(f"\n🎯 PRECISION CLEANING: {Path(input_path).name}")
        
        try:
            # Load original image
            original_img = Image.open(input_path).convert('RGBA')
            original_array = np.array(original_img)
            
            # Analyze design elements in original
            design_mask = self.analyze_design_elements(original_array)
            
            # Apply gentle background removal
            processed_img = self.gentle_background_removal(input_path)
            processed_array = np.array(processed_img)
            
            # Preserve all design details
            processed_array = self.preserve_design_details(original_array, processed_array, design_mask)
            
            # Apply minimal cleanup
            processed_array = self.minimal_cleanup(processed_array, design_mask)
            
            # Calculate preservation stats
            original_design_pixels = np.sum(design_mask)
            final_alpha = processed_array[:, :, 3]
            preserved_design_pixels = np.sum(design_mask & (final_alpha > 100))
            preservation_rate = (preserved_design_pixels / original_design_pixels * 100) if original_design_pixels > 0 else 100
            
            # Save result
            final_img = Image.fromarray(processed_array, 'RGBA')
            final_img.save(output_path, format='WebP', quality=98, method=6)  # Higher quality
            
            print(f"   📊 Results:")
            print(f"      - Design elements identified: {original_design_pixels}")
            print(f"      - Design elements preserved: {preserved_design_pixels}")
            print(f"      - Preservation rate: {preservation_rate:.1f}%")
            print(f"   ✅ PRECISION CLEAN COMPLETE: {Path(output_path).name}")
            
            return True, preservation_rate
            
        except Exception as e:
            print(f"❌ Precision cleaning failed for {Path(input_path).name}: {e}")
            return False, 0
    
    def batch_precision_clean(self, input_dir):
        """Apply precision cleaning to all images"""
        print("🎯 STARTING PRECISION BACKGROUND CLEANING")
        print("🔍 PRIORITY: PRESERVE EVERY DESIGN DETAIL")
        print("🎨 METHOD: ULTRA-CONSERVATIVE APPROACH")
        
        input_path = Path(input_dir)
        
        # Find all image files (excluding backup)
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}
        image_files = [f for f in input_path.iterdir() 
                      if f.suffix.lower() in image_extensions and 'backup' not in str(f)]
        
        if not image_files:
            print("❌ No image files found")
            return
        
        print(f"📊 Found {len(image_files)} images for PRECISION CLEANING")
        
        results = {
            'success': 0, 
            'failed': 0, 
            'cleaned': [],
            'preservation_rates': []
        }
        
        for i, img_file in enumerate(image_files, 1):
            print(f"\n🎯 PRECISION PROGRESS: {i}/{len(image_files)}")
            
            # Create temporary output
            temp_output = img_file.parent / f"precision_clean_{img_file.name}"
            
            success, preservation_rate = self.precision_clean_image(str(img_file), str(temp_output))
            
            if success:
                # Replace original with cleaned version
                temp_output.replace(img_file)
                results['success'] += 1
                results['cleaned'].append(img_file.name)
                results['preservation_rates'].append(preservation_rate)
            else:
                results['failed'] += 1
                # Remove temp file if it exists
                if temp_output.exists():
                    temp_output.unlink()
        
        # Calculate average preservation rate
        avg_preservation = np.mean(results['preservation_rates']) if results['preservation_rates'] else 0
        
        print(f"\n🎯 PRECISION CLEANING COMPLETE!")
        print(f"✅ Successfully cleaned: {results['success']}")
        print(f"❌ Failed: {results['failed']}")
        print(f"🎨 Average design preservation: {avg_preservation:.1f}%")
        
        if results['cleaned']:
            print(f"📋 PRECISION CLEANED FILES:")
            for i, filename in enumerate(results['cleaned']):
                preservation = results['preservation_rates'][i] if i < len(results['preservation_rates']) else 0
                print(f"   🎯 {filename} - {preservation:.1f}% preserved")
        
        return results

# Add missing import
import time

def main():
    parser = argparse.ArgumentParser(description='Precision Background Cleaner')
    parser.add_argument('input', help='Input directory with images to clean')
    
    args = parser.parse_args()
    
    cleaner = PrecisionBackgroundCleaner()
    cleaner.batch_precision_clean(args.input)

if __name__ == '__main__':
    main()
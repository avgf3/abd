#!/usr/bin/env python3
"""
Selective Enhancement System
Fine-tunes each tag based on its specific characteristics
Applies different strategies for different types of designs
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from pathlib import Path
import argparse

class SelectiveEnhancer:
    """Selective enhancement based on image characteristics"""
    
    def __init__(self):
        self.enhancement_strategies = {
            'simple_logo': self.enhance_simple_logo,
            'complex_design': self.enhance_complex_design,
            'text_heavy': self.enhance_text_heavy,
            'colorful_badge': self.enhance_colorful_badge,
            'minimal_design': self.enhance_minimal_design
        }
    
    def analyze_tag_type(self, image_path):
        """Analyze tag to determine its type and best enhancement strategy"""
        print(f"🔍 Analyzing tag type: {Path(image_path).name}")
        
        img = Image.open(image_path).convert('RGBA')
        img_array = np.array(img)
        
        # Extract RGB and Alpha
        rgb = img_array[:, :, :3]
        alpha = img_array[:, :, 3]
        
        # Basic metrics
        height, width = rgb.shape[:2]
        total_pixels = height * width
        
        # Color analysis
        unique_colors = len(np.unique(rgb.reshape(-1, 3), axis=0))
        color_diversity = unique_colors / total_pixels
        
        # Transparency analysis
        transparent_pixels = np.sum(alpha == 0)
        opaque_pixels = np.sum(alpha == 255)
        semi_transparent_pixels = np.sum((alpha > 0) & (alpha < 255))
        
        transparency_ratio = transparent_pixels / total_pixels
        opacity_ratio = opaque_pixels / total_pixels
        semi_ratio = semi_transparent_pixels / total_pixels
        
        # Edge analysis
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / total_pixels
        
        # Color saturation analysis
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        saturation = hsv[:, :, 1]
        avg_saturation = np.mean(saturation[alpha > 0])  # Only consider non-transparent areas
        
        # Text detection (high edge density in specific patterns)
        # Apply morphological operations to detect text-like structures
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1))
        text_features = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        text_density = np.sum(text_features > 0) / total_pixels
        
        # Determine tag type based on characteristics
        tag_type = self.classify_tag_type(
            color_diversity, transparency_ratio, opacity_ratio, semi_ratio,
            edge_density, avg_saturation, text_density, width, height
        )
        
        analysis = {
            'type': tag_type,
            'color_diversity': color_diversity,
            'transparency_ratio': transparency_ratio,
            'opacity_ratio': opacity_ratio,
            'semi_ratio': semi_ratio,
            'edge_density': edge_density,
            'avg_saturation': avg_saturation,
            'text_density': text_density,
            'dimensions': (width, height)
        }
        
        print(f"   📊 Type: {tag_type}")
        print(f"   🎨 Color diversity: {color_diversity:.4f}")
        print(f"   👁️ Transparency: {transparency_ratio:.2f}, Opacity: {opacity_ratio:.2f}, Semi: {semi_ratio:.2f}")
        print(f"   📏 Edge density: {edge_density:.4f}")
        print(f"   🌈 Avg saturation: {avg_saturation:.1f}")
        
        return analysis
    
    def classify_tag_type(self, color_diversity, transparency_ratio, opacity_ratio, 
                         semi_ratio, edge_density, avg_saturation, text_density, width, height):
        """Classify tag type based on analysis metrics"""
        
        # Simple logo: low color diversity, clean edges, moderate transparency
        if (color_diversity < 0.05 and edge_density < 0.08 and 
            transparency_ratio > 0.6 and avg_saturation < 50):
            return 'simple_logo'
        
        # Text heavy: high edge density in linear patterns, high text density
        if text_density > 0.05 or edge_density > 0.15:
            return 'text_heavy'
        
        # Colorful badge: high saturation, moderate color diversity
        if avg_saturation > 40 and color_diversity > 0.03:
            return 'colorful_badge'
        
        # Minimal design: very low color diversity, high transparency
        if color_diversity < 0.02 and transparency_ratio > 0.8:
            return 'minimal_design'
        
        # Default to complex design
        return 'complex_design'
    
    def enhance_simple_logo(self, img):
        """Enhancement for simple logos"""
        print("   🎯 Applying simple logo enhancement...")
        
        img_array = np.array(img)
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # For simple logos, we want clean, sharp edges
        # Apply slight threshold to clean up semi-transparent pixels
        threshold = 80
        alpha[alpha < threshold] = 0
        alpha[alpha >= threshold] = np.minimum(alpha[alpha >= threshold] * 1.1, 255)
        
        # Clean up with small morphological operations
        alpha_binary = (alpha > 0).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        alpha_binary = cv2.morphologyEx(alpha_binary, cv2.MORPH_CLOSE, kernel)
        
        # Apply back
        alpha_cleaned = alpha_binary.astype(np.float32) * 255
        mask = alpha_binary > 0
        alpha_cleaned[mask] = alpha[mask]
        
        img_array[:, :, 3] = alpha_cleaned.astype(np.uint8)
        return Image.fromarray(img_array, 'RGBA')
    
    def enhance_complex_design(self, img):
        """Enhancement for complex designs"""
        print("   🎯 Applying complex design enhancement...")
        
        img_array = np.array(img)
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # For complex designs, preserve more detail
        # Very gentle cleanup
        threshold = 30  # Lower threshold to preserve details
        alpha[alpha < threshold] = 0
        
        # Minimal morphological cleanup
        alpha_binary = (alpha > 0).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (1, 1))
        alpha_binary = cv2.morphologyEx(alpha_binary, cv2.MORPH_OPEN, kernel)
        
        # Preserve original alpha values
        alpha_cleaned = alpha_binary.astype(np.float32) * 255
        mask = alpha_binary > 0
        alpha_cleaned[mask] = alpha[mask]
        
        img_array[:, :, 3] = alpha_cleaned.astype(np.uint8)
        return Image.fromarray(img_array, 'RGBA')
    
    def enhance_text_heavy(self, img):
        """Enhancement for text-heavy designs"""
        print("   🎯 Applying text-heavy enhancement...")
        
        img_array = np.array(img)
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # For text, we need to preserve thin lines and details
        # Very conservative approach
        threshold = 20  # Very low threshold
        alpha[alpha < threshold] = 0
        
        # Use rectangular kernel to preserve text structure
        alpha_binary = (alpha > 0).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
        alpha_binary = cv2.morphologyEx(alpha_binary, cv2.MORPH_CLOSE, kernel)
        
        # Preserve all original alpha values for text clarity
        alpha_cleaned = alpha_binary.astype(np.float32) * 255
        mask = alpha_binary > 0
        alpha_cleaned[mask] = alpha[mask]
        
        img_array[:, :, 3] = alpha_cleaned.astype(np.uint8)
        return Image.fromarray(img_array, 'RGBA')
    
    def enhance_colorful_badge(self, img):
        """Enhancement for colorful badges"""
        print("   🎯 Applying colorful badge enhancement...")
        
        img_array = np.array(img)
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # For colorful badges, balance between clean edges and color preservation
        threshold = 60
        alpha[alpha < threshold] = 0
        alpha[alpha >= threshold] = np.minimum(alpha[alpha >= threshold] * 1.05, 255)
        
        # Medium cleanup
        alpha_binary = (alpha > 0).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        alpha_binary = cv2.morphologyEx(alpha_binary, cv2.MORPH_CLOSE, kernel)
        alpha_binary = cv2.morphologyEx(alpha_binary, cv2.MORPH_OPEN, kernel)
        
        alpha_cleaned = alpha_binary.astype(np.float32) * 255
        mask = alpha_binary > 0
        alpha_cleaned[mask] = alpha[mask]
        
        img_array[:, :, 3] = alpha_cleaned.astype(np.uint8)
        return Image.fromarray(img_array, 'RGBA')
    
    def enhance_minimal_design(self, img):
        """Enhancement for minimal designs"""
        print("   🎯 Applying minimal design enhancement...")
        
        img_array = np.array(img)
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # For minimal designs, we can be more aggressive with cleanup
        threshold = 100
        alpha[alpha < threshold] = 0
        alpha[alpha >= threshold] = 255  # Make fully opaque
        
        # More aggressive cleanup
        alpha_binary = (alpha > 0).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        alpha_binary = cv2.morphologyEx(alpha_binary, cv2.MORPH_CLOSE, kernel)
        alpha_binary = cv2.morphologyEx(alpha_binary, cv2.MORPH_OPEN, kernel)
        
        alpha_cleaned = alpha_binary.astype(np.float32) * 255
        img_array[:, :, 3] = alpha_cleaned.astype(np.uint8)
        return Image.fromarray(img_array, 'RGBA')
    
    def enhance_tag(self, input_path, output_path):
        """Apply selective enhancement to a single tag"""
        print(f"\n🎨 Selective enhancement: {Path(input_path).name}")
        
        try:
            # Analyze tag type
            analysis = self.analyze_tag_type(input_path)
            
            # Load image
            img = Image.open(input_path).convert('RGBA')
            
            # Apply appropriate enhancement strategy
            tag_type = analysis['type']
            if tag_type in self.enhancement_strategies:
                enhanced_img = self.enhancement_strategies[tag_type](img)
            else:
                print(f"   ⚠️ Unknown tag type: {tag_type}, using default enhancement")
                enhanced_img = self.enhance_complex_design(img)
            
            # Save enhanced image
            enhanced_img.save(output_path, format='WebP', quality=95, method=6)
            
            # Analyze result
            result_analysis = self.analyze_result(enhanced_img)
            print(f"   📈 Result: {result_analysis['transparency_ratio']:.1%} transparent, {result_analysis['opacity_ratio']:.1%} opaque")
            print(f"   ✅ Enhanced and saved: {Path(output_path).name}")
            
            return True, analysis, result_analysis
            
        except Exception as e:
            print(f"❌ Failed to enhance {Path(input_path).name}: {e}")
            return False, None, None
    
    def analyze_result(self, img):
        """Analyze the enhanced result"""
        img_array = np.array(img)
        alpha = img_array[:, :, 3]
        
        total_pixels = alpha.size
        transparent = np.sum(alpha == 0)
        semi_transparent = np.sum((alpha > 0) & (alpha < 255))
        opaque = np.sum(alpha == 255)
        
        return {
            'transparency_ratio': transparent / total_pixels,
            'semi_transparent_ratio': semi_transparent / total_pixels,
            'opacity_ratio': opaque / total_pixels
        }
    
    def batch_enhance(self, input_dir):
        """Apply selective enhancement to all tags in directory"""
        print("🎨 Starting selective enhancement...")
        print("🎯 Applying custom strategies for each tag type")
        
        input_path = Path(input_dir)
        
        # Find all image files (excluding backup directory)
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}
        image_files = [f for f in input_path.iterdir() 
                      if f.suffix.lower() in image_extensions and 'backup' not in str(f)]
        
        if not image_files:
            print("❌ No image files found")
            return
        
        print(f"📊 Found {len(image_files)} tags to enhance")
        
        results = {
            'success': 0, 
            'failed': 0, 
            'by_type': {},
            'enhancements': []
        }
        
        for i, img_file in enumerate(image_files, 1):
            print(f"\n📈 Progress: {i}/{len(image_files)}")
            
            # Create temporary output path
            temp_output = img_file.parent / f"temp_{img_file.name}"
            
            success, analysis, result = self.enhance_tag(str(img_file), str(temp_output))
            
            if success and analysis and result:
                # Replace original with enhanced version
                temp_output.replace(img_file)
                
                results['success'] += 1
                
                # Track by type
                tag_type = analysis['type']
                if tag_type not in results['by_type']:
                    results['by_type'][tag_type] = 0
                results['by_type'][tag_type] += 1
                
                results['enhancements'].append({
                    'file': img_file.name,
                    'type': tag_type,
                    'transparency_before': analysis['transparency_ratio'],
                    'transparency_after': result['transparency_ratio']
                })
            else:
                results['failed'] += 1
                # Remove temp file if it exists
                if temp_output.exists():
                    temp_output.unlink()
        
        print(f"\n🎨 Selective enhancement complete!")
        print(f"✅ Successfully enhanced: {results['success']}")
        print(f"❌ Failed: {results['failed']}")
        
        print(f"\n📊 Enhancement by type:")
        for tag_type, count in results['by_type'].items():
            print(f"   🎯 {tag_type}: {count} tags")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='Selective Tag Enhancement System')
    parser.add_argument('input', help='Input directory with tags to enhance')
    
    args = parser.parse_args()
    
    enhancer = SelectiveEnhancer()
    enhancer.batch_enhance(args.input)

if __name__ == '__main__':
    main()
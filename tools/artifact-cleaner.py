#!/usr/bin/env python3
"""
Advanced Artifact Cleaner
Removes all types of artifacts while preserving design elements
Focuses on color artifacts, edge artifacts, and noise
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from pathlib import Path
import argparse
from sklearn.cluster import KMeans

class AdvancedArtifactCleaner:
    """Advanced artifact cleaning system"""
    
    def __init__(self):
        pass
    
    def clean_color_artifacts(self, img_array):
        """Clean color artifacts in semi-transparent areas"""
        print("   🎨 Cleaning color artifacts...")
        
        rgb = img_array[:, :, :3].astype(np.float32)
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Focus on semi-transparent areas (likely to contain artifacts)
        semi_mask = (alpha > 0) & (alpha < 255)
        
        if not np.any(semi_mask):
            return img_array
        
        # Convert to HSV for better color analysis
        hsv = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
        
        # Identify artifact colors in semi-transparent areas
        semi_hsv = hsv[semi_mask]
        
        # Remove low saturation colors (grayish artifacts)
        low_saturation_mask = semi_hsv[:, 1] < 30  # Very low saturation
        
        # Remove very bright or very dark colors (likely artifacts)
        very_bright_mask = semi_hsv[:, 2] > 240
        very_dark_mask = semi_hsv[:, 2] < 20
        
        # Combine artifact masks
        artifact_mask = low_saturation_mask | very_bright_mask | very_dark_mask
        
        # For artifact pixels, reduce their alpha significantly
        semi_indices = np.where(semi_mask)
        artifact_indices = np.where(artifact_mask)[0]
        
        if len(artifact_indices) > 0:
            # Get the actual pixel coordinates
            artifact_coords = (semi_indices[0][artifact_indices], semi_indices[1][artifact_indices])
            
            # Reduce alpha for artifact pixels
            alpha[artifact_coords] = alpha[artifact_coords] * 0.1  # Make mostly transparent
            
            print(f"      - Cleaned {len(artifact_indices)} color artifact pixels")
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def clean_edge_artifacts(self, img_array):
        """Clean artifacts around edges"""
        print("   📏 Cleaning edge artifacts...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        rgb = img_array[:, :, :3].astype(np.float32)
        
        # Create edge detection
        alpha_binary = (alpha > 0).astype(np.uint8) * 255
        edges = cv2.Canny(alpha_binary, 50, 150)
        
        # Create edge region (dilated edges)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        edge_region = cv2.dilate(edges, kernel, iterations=1)
        
        # Find problematic edge pixels
        edge_mask = (edge_region > 0) & (alpha > 0) & (alpha < 200)
        
        if np.any(edge_mask):
            # For edge artifacts, apply graduated transparency
            edge_coords = np.where(edge_mask)
            
            # Calculate distance from solid areas
            solid_mask = (alpha >= 200).astype(np.uint8)
            if np.any(solid_mask):
                dist_transform = cv2.distanceTransform(1 - solid_mask, cv2.DIST_L2, 5)
                
                # Apply graduated alpha based on distance
                for i in range(len(edge_coords[0])):
                    y, x = edge_coords[0][i], edge_coords[1][i]
                    distance = dist_transform[y, x]
                    
                    # Reduce alpha based on distance from solid areas
                    if distance > 2:
                        alpha[y, x] = max(0, alpha[y, x] - distance * 20)
            
            print(f"      - Cleaned {len(edge_coords[0])} edge artifact pixels")
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def clean_isolated_pixels(self, img_array):
        """Remove isolated pixels (noise)"""
        print("   🔊 Cleaning isolated pixels...")
        
        alpha = img_array[:, :, 3]
        
        # Create binary mask
        binary_mask = (alpha > 0).astype(np.uint8)
        
        # Apply morphological opening to remove small isolated regions
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        opened = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel)
        
        # Find isolated pixels
        isolated = binary_mask - opened
        isolated_count = np.sum(isolated)
        
        if isolated_count > 0:
            # Remove isolated pixels
            alpha[isolated > 0] = 0
            img_array[:, :, 3] = alpha
            print(f"      - Removed {isolated_count} isolated pixels")
        
        return img_array
    
    def enhance_main_subject(self, img_array):
        """Enhance the main subject while cleaning artifacts"""
        print("   🎯 Enhancing main subject...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        rgb = img_array[:, :, :3]
        
        # Find the main subject (largest connected component)
        binary_mask = (alpha > 100).astype(np.uint8)
        
        # Find connected components
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary_mask, connectivity=8)
        
        if num_labels > 1:  # More than just background
            # Find the largest component (excluding background)
            largest_component = np.argmax(stats[1:, cv2.CC_STAT_AREA]) + 1
            
            # Create mask for main subject
            main_subject_mask = (labels == largest_component)
            
            # Enhance alpha for main subject
            alpha[main_subject_mask & (alpha > 50)] = np.minimum(
                alpha[main_subject_mask & (alpha > 50)] * 1.2, 255
            )
            
            # Clean up small components (likely artifacts)
            min_area = stats[largest_component, cv2.CC_STAT_AREA] * 0.01  # 1% of main subject
            
            for i in range(1, num_labels):
                if i != largest_component and stats[i, cv2.CC_STAT_AREA] < min_area:
                    component_mask = (labels == i)
                    alpha[component_mask] = alpha[component_mask] * 0.3  # Make mostly transparent
            
            print(f"      - Enhanced main subject, cleaned {num_labels - 2} small components")
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def apply_smart_thresholding(self, img_array):
        """Apply smart thresholding to clean up remaining artifacts"""
        print("   🧠 Applying smart thresholding...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        rgb = img_array[:, :, :3]
        
        # Analyze alpha distribution
        alpha_hist, bins = np.histogram(alpha[alpha > 0], bins=50, range=(1, 255))
        
        # Find optimal threshold using Otsu-like method
        total_pixels = np.sum(alpha_hist)
        
        if total_pixels > 0:
            # Calculate weighted variance for different thresholds
            best_threshold = 50  # Default
            min_variance = float('inf')
            
            for threshold in range(20, 150, 10):
                # Split into two groups
                low_group = alpha_hist[:threshold//5]
                high_group = alpha_hist[threshold//5:]
                
                if len(low_group) > 0 and len(high_group) > 0:
                    low_weight = np.sum(low_group) / total_pixels
                    high_weight = np.sum(high_group) / total_pixels
                    
                    if low_weight > 0 and high_weight > 0:
                        # Calculate within-group variance
                        variance = low_weight * np.var(low_group) + high_weight * np.var(high_group)
                        
                        if variance < min_variance:
                            min_variance = variance
                            best_threshold = threshold
            
            # Apply threshold
            low_alpha_mask = (alpha > 0) & (alpha < best_threshold)
            alpha[low_alpha_mask] = alpha[low_alpha_mask] * 0.2  # Make mostly transparent
            
            print(f"      - Applied threshold: {best_threshold}")
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def final_cleanup(self, img_array):
        """Final cleanup pass"""
        print("   ✨ Final cleanup...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Apply gentle gaussian blur to smooth transitions
        alpha_blurred = cv2.GaussianBlur(alpha, (3, 3), 0.5)
        
        # Only apply blur to semi-transparent areas
        semi_mask = (alpha > 0) & (alpha < 255)
        alpha[semi_mask] = alpha_blurred[semi_mask]
        
        # Final threshold to clean up very low alpha values
        alpha[alpha < 10] = 0
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def clean_image(self, input_path, output_path):
        """Clean all artifacts from a single image"""
        print(f"\n🧹 Deep cleaning: {Path(input_path).name}")
        
        try:
            # Load image
            img = Image.open(input_path).convert('RGBA')
            img_array = np.array(img)
            
            # Store original for comparison
            original_alpha = img_array[:, :, 3].copy()
            
            # Apply cleaning steps
            img_array = self.clean_color_artifacts(img_array)
            img_array = self.clean_edge_artifacts(img_array)
            img_array = self.clean_isolated_pixels(img_array)
            img_array = self.enhance_main_subject(img_array)
            img_array = self.apply_smart_thresholding(img_array)
            img_array = self.final_cleanup(img_array)
            
            # Calculate improvement
            final_alpha = img_array[:, :, 3]
            
            original_artifacts = np.sum((original_alpha > 0) & (original_alpha < 100))
            final_artifacts = np.sum((final_alpha > 0) & (final_alpha < 100))
            
            improvement = max(0, original_artifacts - final_artifacts)
            
            # Save cleaned image
            cleaned_img = Image.fromarray(img_array, 'RGBA')
            cleaned_img.save(output_path, format='WebP', quality=95, method=6)
            
            print(f"   📈 Cleaned {improvement} artifact pixels")
            print(f"   ✅ Saved: {Path(output_path).name}")
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to clean {Path(input_path).name}: {e}")
            return False
    
    def batch_clean(self, input_dir):
        """Clean all images in directory"""
        print("🧹 Starting deep artifact cleaning...")
        print("🎯 Target: Remove all color and edge artifacts")
        
        input_path = Path(input_dir)
        
        # Find all image files (excluding backup)
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}
        image_files = [f for f in input_path.iterdir() 
                      if f.suffix.lower() in image_extensions and 'backup' not in str(f)]
        
        if not image_files:
            print("❌ No image files found")
            return
        
        print(f"📊 Found {len(image_files)} images to clean")
        
        results = {'success': 0, 'failed': 0, 'cleaned': []}
        
        for i, img_file in enumerate(image_files, 1):
            print(f"\n📈 Progress: {i}/{len(image_files)}")
            
            # Create temporary output
            temp_output = img_file.parent / f"temp_clean_{img_file.name}"
            
            success = self.clean_image(str(img_file), str(temp_output))
            
            if success:
                # Replace original with cleaned version
                temp_output.replace(img_file)
                results['success'] += 1
                results['cleaned'].append(img_file.name)
            else:
                results['failed'] += 1
                # Remove temp file if it exists
                if temp_output.exists():
                    temp_output.unlink()
        
        print(f"\n🧹 Deep cleaning complete!")
        print(f"✅ Successfully cleaned: {results['success']}")
        print(f"❌ Failed: {results['failed']}")
        
        if results['cleaned']:
            print(f"📋 Cleaned files:")
            for filename in results['cleaned']:
                print(f"   ✅ {filename}")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='Advanced Artifact Cleaner')
    parser.add_argument('input', help='Input directory with images to clean')
    
    args = parser.parse_args()
    
    cleaner = AdvancedArtifactCleaner()
    cleaner.batch_clean(args.input)

if __name__ == '__main__':
    main()
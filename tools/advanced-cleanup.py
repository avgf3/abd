#!/usr/bin/env python3
"""
Advanced Background Cleanup System
Removes all remaining background artifacts and semi-transparent pixels
Uses multiple AI models and advanced image processing techniques
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
from sklearn.cluster import KMeans
from scipy import ndimage
import io

class AdvancedBackgroundCleaner:
    """Advanced system for complete background removal with multiple techniques"""
    
    def __init__(self):
        self.models = {
            'u2net': 'Best general purpose',
            'isnet-general-use': 'Latest general model',
            'silueta': 'Good for logos and objects',
            'u2netp': 'Lightweight but effective'
        }
        self.sessions = {}
        self.initialize_models()
    
    def initialize_models(self):
        """Initialize multiple AI models for comparison"""
        print("🤖 Initializing multiple AI models...")
        for model_name in self.models.keys():
            try:
                print(f"   Loading {model_name}...")
                self.sessions[model_name] = new_session(model_name)
                print(f"   ✅ {model_name} loaded successfully")
            except Exception as e:
                print(f"   ❌ Failed to load {model_name}: {e}")
        
        print(f"✅ Loaded {len(self.sessions)} AI models")
    
    def analyze_background_artifacts(self, image_path):
        """Analyze image to detect background artifacts"""
        print(f"🔍 Analyzing background artifacts in {Path(image_path).name}")
        
        img = Image.open(image_path).convert('RGBA')
        img_array = np.array(img)
        
        # Extract alpha channel
        alpha = img_array[:, :, 3]
        
        # Analyze alpha distribution
        unique_values, counts = np.unique(alpha, return_counts=True)
        total_pixels = alpha.size
        
        analysis = {
            'transparent_pixels': np.sum(alpha == 0),
            'opaque_pixels': np.sum(alpha == 255),
            'semi_transparent_pixels': np.sum((alpha > 0) & (alpha < 255)),
            'total_pixels': total_pixels,
            'unique_alpha_values': len(unique_values),
            'alpha_distribution': dict(zip(unique_values, counts))
        }
        
        # Calculate percentages
        analysis['transparent_percent'] = (analysis['transparent_pixels'] / total_pixels) * 100
        analysis['opaque_percent'] = (analysis['opaque_pixels'] / total_pixels) * 100
        analysis['semi_transparent_percent'] = (analysis['semi_transparent_pixels'] / total_pixels) * 100
        
        # Detect problematic areas
        problems = []
        if analysis['semi_transparent_percent'] > 20:
            problems.append("High semi-transparency - likely background artifacts")
        if analysis['transparent_percent'] < 30:
            problems.append("Low transparency - background not fully removed")
        if analysis['unique_alpha_values'] > 50:
            problems.append("Too many alpha values - noisy edges")
        
        analysis['problems'] = problems
        
        return analysis
    
    def remove_background_multi_model(self, image_path):
        """Use multiple AI models and select the best result"""
        print(f"🤖 Processing with multiple AI models: {Path(image_path).name}")
        
        with open(image_path, 'rb') as f:
            input_data = f.read()
        
        results = {}
        
        for model_name, session in self.sessions.items():
            try:
                print(f"   Testing {model_name}...")
                start_time = time.time()
                
                output_data = remove(input_data, session=session)
                processing_time = time.time() - start_time
                
                # Convert to PIL Image for analysis
                result_img = Image.open(io.BytesIO(output_data)).convert('RGBA')
                
                # Analyze quality
                img_array = np.array(result_img)
                alpha = img_array[:, :, 3]
                
                quality_score = self.calculate_quality_score(alpha)
                
                results[model_name] = {
                    'image': result_img,
                    'data': output_data,
                    'processing_time': processing_time,
                    'quality_score': quality_score,
                    'transparent_percent': (np.sum(alpha == 0) / alpha.size) * 100,
                    'semi_transparent_percent': (np.sum((alpha > 0) & (alpha < 255)) / alpha.size) * 100
                }
                
                print(f"   ✅ {model_name}: Quality={quality_score:.1f}, Time={processing_time:.2f}s")
                
            except Exception as e:
                print(f"   ❌ {model_name} failed: {e}")
        
        if not results:
            raise Exception("All AI models failed")
        
        # Select best result based on quality score
        best_model = max(results.keys(), key=lambda k: results[k]['quality_score'])
        best_result = results[best_model]
        
        print(f"🏆 Best result from {best_model} (Quality: {best_result['quality_score']:.1f})")
        
        return best_result['image'], best_model, results
    
    def calculate_quality_score(self, alpha):
        """Calculate quality score based on alpha channel analysis"""
        total_pixels = alpha.size
        transparent = np.sum(alpha == 0)
        opaque = np.sum(alpha == 255)
        semi_transparent = np.sum((alpha > 0) & (alpha < 255))
        
        # Base score
        score = 50
        
        # Reward good transparency
        transparency_ratio = transparent / total_pixels
        if transparency_ratio > 0.4:  # Good background removal
            score += 30
        elif transparency_ratio > 0.2:
            score += 15
        
        # Penalize too much semi-transparency (artifacts)
        semi_ratio = semi_transparent / total_pixels
        if semi_ratio < 0.1:  # Clean edges
            score += 20
        elif semi_ratio < 0.2:
            score += 10
        else:  # Too much semi-transparency
            score -= (semi_ratio - 0.2) * 100
        
        # Ensure reasonable subject preservation
        opaque_ratio = opaque / total_pixels
        if opaque_ratio > 0.1:  # Good subject preservation
            score += 10
        elif opaque_ratio < 0.05:  # Subject might be over-removed
            score -= 20
        
        return max(0, min(100, score))
    
    def aggressive_cleanup(self, img):
        """Apply aggressive cleanup to remove all background artifacts"""
        print("🧹 Applying aggressive background cleanup...")
        
        img_array = np.array(img)
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Step 1: Threshold semi-transparent pixels
        print("   Step 1: Thresholding semi-transparent pixels")
        # Convert semi-transparent pixels to either fully transparent or opaque
        alpha_threshold = 128  # Adjust this value for more/less aggressive cleanup
        alpha[alpha < alpha_threshold] = 0  # Make transparent
        alpha[alpha >= alpha_threshold] = 255  # Make opaque
        
        # Step 2: Morphological operations to clean up
        print("   Step 2: Morphological cleanup")
        alpha_binary = (alpha > 0).astype(np.uint8)
        
        # Remove small noise
        kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        alpha_binary = cv2.morphologyEx(alpha_binary, cv2.MORPH_OPEN, kernel_small)
        
        # Fill small holes
        kernel_medium = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        alpha_binary = cv2.morphologyEx(alpha_binary, cv2.MORPH_CLOSE, kernel_medium)
        
        # Step 3: Connected component analysis
        print("   Step 3: Connected component analysis")
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(alpha_binary, connectivity=8)
        
        # Keep only large components (remove small artifacts)
        min_area = alpha_binary.size * 0.001  # Minimum 0.1% of image area
        large_components = np.zeros_like(alpha_binary)
        
        for i in range(1, num_labels):  # Skip background (label 0)
            if stats[i, cv2.CC_STAT_AREA] >= min_area:
                large_components[labels == i] = 1
        
        # Step 4: Edge refinement
        print("   Step 4: Edge refinement")
        # Apply slight gaussian blur to smooth edges
        alpha_refined = large_components.astype(np.float32) * 255
        alpha_refined = cv2.GaussianBlur(alpha_refined, (3, 3), 0.5)
        
        # Step 5: Color cleanup for remaining pixels
        print("   Step 5: Color cleanup")
        # For pixels that are now transparent, ensure RGB is also clean
        transparent_mask = alpha_refined == 0
        img_array[transparent_mask, :3] = [255, 255, 255]  # Set to white (or any color)
        
        # Update alpha channel
        img_array[:, :, 3] = alpha_refined.astype(np.uint8)
        
        return Image.fromarray(img_array, 'RGBA')
    
    def smart_cleanup(self, img):
        """Apply smart cleanup using color analysis"""
        print("🎨 Applying smart color-based cleanup...")
        
        img_array = np.array(img)
        height, width = img_array.shape[:2]
        
        # Reshape for clustering
        pixels = img_array.reshape(-1, 4)  # RGBA
        
        # Only analyze non-fully-transparent pixels
        non_transparent = pixels[pixels[:, 3] > 0]
        
        if len(non_transparent) == 0:
            return img
        
        # Cluster colors to identify background vs foreground
        n_clusters = min(8, len(non_transparent) // 100)  # Adaptive number of clusters
        if n_clusters < 2:
            return img
        
        print(f"   Clustering colors into {n_clusters} groups...")
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(non_transparent[:, :3])  # Only RGB for clustering
        
        # Analyze clusters to identify likely background colors
        cluster_centers = kmeans.cluster_centers_
        cluster_sizes = np.bincount(cluster_labels)
        
        # Background clusters are typically:
        # 1. Large in size (cover many pixels)
        # 2. Located near edges
        # 3. Have low saturation (grayish)
        
        background_clusters = []
        for i, (center, size) in enumerate(zip(cluster_centers, cluster_sizes)):
            # Calculate saturation
            rgb = center / 255.0
            saturation = max(rgb) - min(rgb)
            
            # Check if cluster is likely background
            size_ratio = size / len(non_transparent)
            if size_ratio > 0.1 and saturation < 0.3:  # Large and unsaturated
                background_clusters.append(i)
        
        if background_clusters:
            print(f"   Identified {len(background_clusters)} background color clusters")
            
            # Create mask for background pixels
            background_mask = np.zeros(len(non_transparent), dtype=bool)
            for cluster_id in background_clusters:
                background_mask |= (cluster_labels == cluster_id)
            
            # Map back to image coordinates
            non_transparent_indices = np.where(pixels[:, 3] > 0)[0]
            background_pixel_indices = non_transparent_indices[background_mask]
            
            # Set background pixels to transparent
            pixels[background_pixel_indices, 3] = 0  # Make transparent
            
            # Reshape back to image
            cleaned_array = pixels.reshape(height, width, 4)
            return Image.fromarray(cleaned_array.astype(np.uint8), 'RGBA')
        
        return img
    
    def process_image_complete(self, input_path, output_path):
        """Complete processing pipeline for perfect background removal"""
        print(f"\n🎯 Complete processing: {Path(input_path).name}")
        
        try:
            # Step 1: Analyze current state
            analysis = self.analyze_background_artifacts(input_path)
            print(f"📊 Current state: {analysis['transparent_percent']:.1f}% transparent, {analysis['semi_transparent_percent']:.1f}% semi-transparent")
            
            if analysis['problems']:
                print("⚠️ Issues detected:")
                for problem in analysis['problems']:
                    print(f"   - {problem}")
            
            # Step 2: Multi-model background removal
            best_img, best_model, all_results = self.remove_background_multi_model(input_path)
            
            # Step 3: Apply aggressive cleanup
            cleaned_img = self.aggressive_cleanup(best_img)
            
            # Step 4: Apply smart color-based cleanup
            final_img = self.smart_cleanup(cleaned_img)
            
            # Step 5: Final quality check
            final_analysis = self.analyze_background_artifacts_from_image(final_img)
            print(f"📈 Final result: {final_analysis['transparent_percent']:.1f}% transparent, {final_analysis['semi_transparent_percent']:.1f}% semi-transparent")
            
            # Step 6: Save result
            final_img.save(output_path, format='PNG', optimize=True)
            
            # Convert to WebP for final output
            webp_path = output_path.replace('.png', '.webp')
            final_img.save(webp_path, format='WebP', quality=95, method=6)
            
            print(f"✅ Saved: {Path(webp_path).name}")
            
            # Remove PNG file, keep WebP
            if os.path.exists(output_path):
                os.remove(output_path)
            
            return True, final_analysis
            
        except Exception as e:
            print(f"❌ Failed to process {Path(input_path).name}: {e}")
            return False, None
    
    def analyze_background_artifacts_from_image(self, img):
        """Analyze background artifacts from PIL Image"""
        img_array = np.array(img)
        alpha = img_array[:, :, 3]
        
        total_pixels = alpha.size
        transparent = np.sum(alpha == 0)
        opaque = np.sum(alpha == 255)
        semi_transparent = np.sum((alpha > 0) & (alpha < 255))
        
        return {
            'transparent_pixels': transparent,
            'opaque_pixels': opaque,
            'semi_transparent_pixels': semi_transparent,
            'total_pixels': total_pixels,
            'transparent_percent': (transparent / total_pixels) * 100,
            'opaque_percent': (opaque / total_pixels) * 100,
            'semi_transparent_percent': (semi_transparent / total_pixels) * 100
        }
    
    def batch_process(self, input_dir, output_dir):
        """Process all images in directory with complete cleanup"""
        print("🚀 Starting advanced batch cleanup...")
        
        input_path = Path(input_dir)
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Find all image files
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}
        image_files = [f for f in input_path.iterdir() 
                      if f.suffix.lower() in image_extensions]
        
        if not image_files:
            print("❌ No image files found")
            return
        
        print(f"📊 Found {len(image_files)} images to clean")
        
        results = {'success': 0, 'failed': 0, 'improvements': []}
        
        for i, img_file in enumerate(image_files, 1):
            print(f"\n📈 Progress: {i}/{len(image_files)}")
            
            output_file = output_path / f"{img_file.stem}.webp"
            
            success, analysis = self.process_image_complete(str(img_file), str(output_file).replace('.webp', '.png'))
            
            if success and analysis:
                results['success'] += 1
                
                # Track improvements
                if analysis['semi_transparent_percent'] < 10:  # Good cleanup
                    results['improvements'].append({
                        'file': img_file.name,
                        'transparent_percent': analysis['transparent_percent'],
                        'semi_transparent_percent': analysis['semi_transparent_percent']
                    })
            else:
                results['failed'] += 1
        
        print(f"\n🎉 Advanced cleanup complete!")
        print(f"✅ Success: {results['success']}")
        print(f"❌ Failed: {results['failed']}")
        print(f"🎯 Clean results: {len(results['improvements'])}")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='Advanced Background Cleanup System')
    parser.add_argument('input', help='Input directory with images to clean')
    parser.add_argument('output', help='Output directory for cleaned images')
    
    args = parser.parse_args()
    
    cleaner = AdvancedBackgroundCleaner()
    cleaner.batch_process(args.input, args.output)

if __name__ == '__main__':
    main()
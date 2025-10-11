#!/usr/bin/env python3
"""
🧠 SMARTEST ARTIFACT DESTROYER 🧠
The most intelligent background cleaning system ever created
Uses advanced AI, deep learning, and computer vision techniques
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
from pathlib import Path
import argparse
from rembg import remove, new_session
import time
from sklearn.cluster import KMeans, DBSCAN
from sklearn.mixture import GaussianMixture
from scipy import ndimage, signal
from scipy.spatial.distance import cdist
import warnings
warnings.filterwarnings('ignore')

class SmartestArtifactDestroyer:
    """🧠 The most intelligent artifact cleaning system ever created"""
    
    def __init__(self):
        self.models = {}
        self.initialize_ai_models()
        
    def initialize_ai_models(self):
        """Initialize multiple AI models for maximum intelligence"""
        print("🧠 Initializing SMARTEST AI models...")
        
        models_to_load = ['u2net', 'isnet-general-use', 'silueta', 'u2netp']
        
        for model_name in models_to_load:
            try:
                print(f"   🤖 Loading {model_name}...")
                self.models[model_name] = new_session(model_name)
                print(f"   ✅ {model_name} loaded successfully")
            except Exception as e:
                print(f"   ⚠️ {model_name} failed: {e}")
        
        print(f"🧠 Loaded {len(self.models)} AI models for maximum intelligence")
    
    def ai_content_analysis(self, img_array):
        """🧠 Advanced AI content analysis using multiple techniques"""
        print("   🧠 AI Content Analysis...")
        
        rgb = img_array[:, :, :3]
        height, width = rgb.shape[:2]
        
        # Multi-space color analysis
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
        yuv = cv2.cvtColor(rgb, cv2.COLOR_RGB2YUV)
        
        # Advanced edge detection with multiple methods
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        
        # Canny edges
        edges_canny = cv2.Canny(gray, 30, 100)
        
        # Sobel edges
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        edges_sobel = np.sqrt(sobel_x**2 + sobel_y**2)
        
        # Laplacian edges
        edges_laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        
        # Combine edge information
        edges_combined = np.maximum(edges_canny, 
                                   np.maximum((edges_sobel > 50).astype(np.uint8) * 255,
                                             (np.abs(edges_laplacian) > 10).astype(np.uint8) * 255))
        
        # Advanced texture analysis
        # Local Binary Pattern approximation
        kernel = np.array([[-1,-1,-1],[-1,8,-1],[-1,-1,-1]])
        texture = cv2.filter2D(gray, -1, kernel)
        high_texture = np.abs(texture) > 20
        
        # Color variance analysis
        color_variance = np.var(rgb, axis=2)
        high_variance = color_variance > 100
        
        # Saturation analysis in HSV
        high_saturation = hsv[:, :, 1] > 40
        
        # Brightness analysis
        brightness = hsv[:, :, 2]
        good_brightness = (brightness > 30) & (brightness < 240)
        
        # Advanced design element detection
        design_elements = (high_saturation | high_variance | high_texture | 
                          (edges_combined > 0)) & good_brightness
        
        # Morphological operations to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        design_elements = cv2.morphologyEx(design_elements.astype(np.uint8), 
                                          cv2.MORPH_CLOSE, kernel)
        
        design_pixels = np.sum(design_elements)
        print(f"      🎯 Detected {design_pixels} design element pixels")
        
        return design_elements.astype(bool), edges_combined, high_saturation
    
    def intelligent_model_selection(self, img_array, design_mask):
        """🧠 Intelligently select the best AI model for this specific image"""
        print("   🤖 Intelligent model selection...")
        
        # Analyze image characteristics
        design_density = np.sum(design_mask) / design_mask.size
        
        rgb = img_array[:, :, :3]
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        
        avg_saturation = np.mean(hsv[:, :, 1][design_mask])
        color_complexity = len(np.unique(rgb.reshape(-1, 3), axis=0)) / rgb.size
        
        # Intelligent model selection based on image characteristics
        if design_density > 0.3 and avg_saturation > 100:
            # Complex colorful design - use silueta
            selected_model = 'silueta'
            reason = "Complex colorful design detected"
        elif design_density < 0.1:
            # Simple design - use u2netp (faster)
            selected_model = 'u2netp'
            reason = "Simple design detected"
        elif color_complexity > 0.1:
            # High color complexity - use isnet-general-use
            selected_model = 'isnet-general-use'
            reason = "High color complexity detected"
        else:
            # Default to u2net
            selected_model = 'u2net'
            reason = "General purpose processing"
        
        # Fallback if selected model not available
        if selected_model not in self.models:
            selected_model = list(self.models.keys())[0]
            reason = f"Fallback to {selected_model}"
        
        print(f"      🎯 Selected {selected_model}: {reason}")
        return selected_model
    
    def multi_model_ensemble(self, input_path, design_mask):
        """🧠 Use multiple AI models and intelligently combine results"""
        print("   🤖 Multi-model AI ensemble processing...")
        
        with open(input_path, 'rb') as f:
            input_data = f.read()
        
        results = {}
        
        # Process with multiple models
        for model_name, session in self.models.items():
            try:
                print(f"      Processing with {model_name}...")
                start_time = time.time()
                
                output_data = remove(input_data, session=session)
                processing_time = time.time() - start_time
                
                # Load result
                import io
                result_img = Image.open(io.BytesIO(output_data)).convert('RGBA')
                result_array = np.array(result_img)
                
                # Analyze quality
                alpha = result_array[:, :, 3]
                
                # Quality metrics
                design_preservation = np.sum(design_mask & (alpha > 100)) / np.sum(design_mask)
                background_removal = np.sum((~design_mask) & (alpha < 50)) / np.sum(~design_mask)
                edge_quality = self.calculate_edge_quality(result_array, design_mask)
                
                overall_quality = (design_preservation * 0.4 + 
                                 background_removal * 0.4 + 
                                 edge_quality * 0.2)
                
                results[model_name] = {
                    'image': result_array,
                    'quality': overall_quality,
                    'design_preservation': design_preservation,
                    'background_removal': background_removal,
                    'edge_quality': edge_quality,
                    'processing_time': processing_time
                }
                
                print(f"         Quality: {overall_quality:.3f} ({processing_time:.2f}s)")
                
            except Exception as e:
                print(f"         ❌ {model_name} failed: {e}")
        
        if not results:
            raise Exception("All AI models failed")
        
        # Select best result
        best_model = max(results.keys(), key=lambda k: results[k]['quality'])
        best_result = results[best_model]
        
        print(f"      🏆 Best result: {best_model} (Quality: {best_result['quality']:.3f})")
        
        # Intelligent ensemble combination
        if len(results) > 1:
            print("      🧠 Applying intelligent ensemble combination...")
            combined_result = self.intelligent_ensemble_combination(results, design_mask)
            return combined_result
        
        return best_result['image']
    
    def calculate_edge_quality(self, img_array, design_mask):
        """Calculate edge quality score"""
        alpha = img_array[:, :, 3]
        
        # Find edges in alpha channel
        edges = cv2.Canny(alpha, 50, 150)
        
        # Check edge quality in design areas
        design_edges = edges & design_mask.astype(np.uint8) * 255
        
        if np.sum(design_edges) == 0:
            return 0.5
        
        # Calculate edge smoothness
        edge_coords = np.where(design_edges > 0)
        if len(edge_coords[0]) == 0:
            return 0.5
        
        edge_alpha_values = alpha[edge_coords]
        edge_variance = np.var(edge_alpha_values)
        
        # Lower variance = smoother edges = better quality
        edge_quality = max(0, 1 - edge_variance / 10000)
        
        return edge_quality
    
    def intelligent_ensemble_combination(self, results, design_mask):
        """🧠 Intelligently combine results from multiple models"""
        
        # Get all result arrays
        arrays = [result['image'] for result in results.values()]
        qualities = [result['quality'] for result in results.values()]
        
        # Weighted combination based on quality
        weights = np.array(qualities)
        weights = weights / np.sum(weights)  # Normalize
        
        # Combine alpha channels intelligently
        combined_alpha = np.zeros(arrays[0][:, :, 3].shape, dtype=np.float32)
        combined_rgb = np.zeros(arrays[0][:, :, :3].shape, dtype=np.float32)
        
        for i, (array, weight) in enumerate(zip(arrays, weights)):
            combined_alpha += array[:, :, 3].astype(np.float32) * weight
            combined_rgb += array[:, :, :3].astype(np.float32) * weight
        
        # Create combined result
        combined_array = np.zeros_like(arrays[0])
        combined_array[:, :, :3] = combined_rgb.astype(np.uint8)
        combined_array[:, :, 3] = combined_alpha.astype(np.uint8)
        
        return combined_array
    
    def advanced_artifact_detection(self, img_array, design_mask):
        """🧠 Advanced AI-powered artifact detection"""
        print("   🔍 Advanced artifact detection...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        rgb = img_array[:, :, :3]
        
        # Convert to multiple color spaces for analysis
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
        
        # Advanced artifact detection using machine learning clustering
        # Prepare features for clustering
        height, width = alpha.shape
        
        # Create feature vectors for each pixel
        features = []
        coords = []
        
        for y in range(height):
            for x in range(width):
                if alpha[y, x] > 0:  # Only consider non-transparent pixels
                    feature_vector = [
                        rgb[y, x, 0], rgb[y, x, 1], rgb[y, x, 2],  # RGB
                        hsv[y, x, 0], hsv[y, x, 1], hsv[y, x, 2],  # HSV
                        lab[y, x, 0], lab[y, x, 1], lab[y, x, 2],  # LAB
                        alpha[y, x],  # Alpha
                        x / width, y / height,  # Normalized position
                        int(design_mask[y, x])  # Design mask
                    ]
                    features.append(feature_vector)
                    coords.append((y, x))
        
        if len(features) < 10:
            return np.zeros_like(alpha, dtype=bool)
        
        features = np.array(features)
        
        # Use Gaussian Mixture Model for intelligent clustering
        n_components = min(8, len(features) // 50)
        if n_components < 2:
            return np.zeros_like(alpha, dtype=bool)
        
        gmm = GaussianMixture(n_components=n_components, random_state=42)
        cluster_labels = gmm.fit_predict(features)
        
        # Analyze clusters to identify artifacts
        artifact_mask = np.zeros_like(alpha, dtype=bool)
        
        for cluster_id in range(n_components):
            cluster_mask = cluster_labels == cluster_id
            cluster_features = features[cluster_mask]
            
            if len(cluster_features) == 0:
                continue
            
            # Analyze cluster characteristics
            avg_saturation = np.mean(cluster_features[:, 4])  # HSV saturation
            avg_alpha = np.mean(cluster_features[:, 9])  # Alpha
            in_design_ratio = np.mean(cluster_features[:, 11])  # Design mask ratio
            
            # Identify artifact clusters
            is_artifact = (
                (avg_saturation < 30 and in_design_ratio < 0.3) or  # Low saturation, not in design
                (avg_alpha < 80 and in_design_ratio < 0.5) or  # Low alpha, not in design
                (avg_saturation < 10)  # Very low saturation (grayish)
            )
            
            if is_artifact:
                # Mark these pixels as artifacts
                cluster_coords = [coords[i] for i in range(len(coords)) if cluster_mask[i]]
                for y, x in cluster_coords:
                    artifact_mask[y, x] = True
        
        artifact_count = np.sum(artifact_mask)
        print(f"      🎯 Detected {artifact_count} artifact pixels using AI clustering")
        
        return artifact_mask
    
    def intelligent_artifact_removal(self, img_array, design_mask, artifact_mask):
        """🧠 Intelligently remove artifacts while preserving design"""
        print("   🧹 Intelligent artifact removal...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Remove artifacts with different strategies based on location
        artifact_coords = np.where(artifact_mask)
        
        if len(artifact_coords[0]) == 0:
            return img_array
        
        # Strategy 1: Complete removal for artifacts far from design
        design_distance = cv2.distanceTransform((~design_mask).astype(np.uint8), 
                                               cv2.DIST_L2, 5)
        
        far_from_design = artifact_mask & (design_distance > 5)
        alpha[far_from_design] = 0
        
        # Strategy 2: Gradual reduction for artifacts near design
        near_design = artifact_mask & (design_distance <= 5) & (design_distance > 0)
        if np.any(near_design):
            near_coords = np.where(near_design)
            for i in range(len(near_coords[0])):
                y, x = near_coords[0][i], near_coords[1][i]
                distance = design_distance[y, x]
                reduction_factor = min(0.8, distance / 5)
                alpha[y, x] = alpha[y, x] * reduction_factor
        
        # Strategy 3: Smart blending for artifacts within design areas
        within_design = artifact_mask & design_mask
        if np.any(within_design):
            # Use surrounding non-artifact design pixels for blending
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            design_non_artifact = design_mask & (~artifact_mask)
            
            if np.any(design_non_artifact):
                # Dilate non-artifact design areas
                expanded_good = cv2.dilate(design_non_artifact.astype(np.uint8), kernel)
                
                # For artifacts within design, blend with nearby good pixels
                within_coords = np.where(within_design)
                for i in range(len(within_coords[0])):
                    y, x = within_coords[0][i], within_coords[1][i]
                    
                    # Find nearby good pixels
                    y_start, y_end = max(0, y-2), min(alpha.shape[0], y+3)
                    x_start, x_end = max(0, x-2), min(alpha.shape[1], x+3)
                    
                    nearby_good = expanded_good[y_start:y_end, x_start:x_end]
                    nearby_alpha = alpha[y_start:y_end, x_start:x_end]
                    
                    if np.any(nearby_good):
                        good_alpha_values = nearby_alpha[nearby_good > 0]
                        if len(good_alpha_values) > 0:
                            alpha[y, x] = np.mean(good_alpha_values)
        
        removed_artifacts = np.sum(artifact_mask)
        print(f"      ✅ Intelligently processed {removed_artifacts} artifacts")
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def advanced_edge_enhancement(self, img_array, design_mask):
        """🧠 Advanced edge enhancement using AI techniques"""
        print("   ✨ Advanced edge enhancement...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Find design edges
        design_binary = design_mask.astype(np.uint8) * 255
        edges = cv2.Canny(design_binary, 50, 150)
        
        # Create edge regions
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        edge_regions = cv2.dilate(edges, kernel, iterations=1)
        
        # Apply intelligent edge enhancement
        edge_coords = np.where((edge_regions > 0) & design_mask)
        
        if len(edge_coords[0]) > 0:
            # Analyze local alpha values around edges
            for i in range(len(edge_coords[0])):
                y, x = edge_coords[0][i], edge_coords[1][i]
                
                # Get local neighborhood
                y_start, y_end = max(0, y-1), min(alpha.shape[0], y+2)
                x_start, x_end = max(0, x-1), min(alpha.shape[1], x+2)
                
                local_alpha = alpha[y_start:y_end, x_start:x_end]
                local_design = design_mask[y_start:y_end, x_start:x_end]
                
                # Calculate local statistics
                design_alpha_values = local_alpha[local_design]
                
                if len(design_alpha_values) > 0:
                    local_mean = np.mean(design_alpha_values)
                    local_std = np.std(design_alpha_values)
                    
                    # Enhance edge if it's weaker than surrounding area
                    if alpha[y, x] < local_mean - local_std:
                        alpha[y, x] = min(255, local_mean)
            
            print(f"      ✨ Enhanced {len(edge_coords[0])} edge pixels")
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def final_ai_polish(self, img_array):
        """🧠 Final AI-powered polishing"""
        print("   💎 Final AI polish...")
        
        alpha = img_array[:, :, 3].astype(np.float32)
        
        # Apply intelligent smoothing
        # Use bilateral filter to smooth while preserving edges
        alpha_smooth = cv2.bilateralFilter(alpha.astype(np.uint8), 5, 50, 50).astype(np.float32)
        
        # Only apply smoothing to semi-transparent areas
        semi_mask = (alpha > 10) & (alpha < 245)
        alpha[semi_mask] = alpha_smooth[semi_mask]
        
        # Final cleanup of very weak pixels
        alpha[alpha < 8] = 0
        
        img_array[:, :, 3] = alpha.astype(np.uint8)
        return img_array
    
    def smartest_process_image(self, input_path, output_path):
        """🧠 The smartest image processing ever created"""
        print(f"\n🧠 SMARTEST PROCESSING: {Path(input_path).name}")
        
        try:
            # Load original image
            original_img = Image.open(input_path).convert('RGBA')
            original_array = np.array(original_img)
            
            # Step 1: Advanced AI content analysis
            design_mask, edges, high_saturation = self.ai_content_analysis(original_array)
            
            # Step 2: Multi-model AI ensemble processing
            processed_array = self.multi_model_ensemble(input_path, design_mask)
            
            # Step 3: Advanced artifact detection using AI
            artifact_mask = self.advanced_artifact_detection(processed_array, design_mask)
            
            # Step 4: Intelligent artifact removal
            processed_array = self.intelligent_artifact_removal(processed_array, design_mask, artifact_mask)
            
            # Step 5: Advanced edge enhancement
            processed_array = self.advanced_edge_enhancement(processed_array, design_mask)
            
            # Step 6: Final AI polish
            processed_array = self.final_ai_polish(processed_array)
            
            # Calculate intelligence metrics
            original_artifacts = np.sum(artifact_mask)
            final_alpha = processed_array[:, :, 3]
            design_preservation = np.sum(design_mask & (final_alpha > 100)) / np.sum(design_mask) * 100
            
            # Save result with maximum quality
            final_img = Image.fromarray(processed_array, 'RGBA')
            final_img.save(output_path, format='WebP', quality=98, method=6)
            
            print(f"   🧠 INTELLIGENCE METRICS:")
            print(f"      🎯 Design elements detected: {np.sum(design_mask)}")
            print(f"      🧹 Artifacts destroyed: {original_artifacts}")
            print(f"      🎨 Design preservation: {design_preservation:.1f}%")
            print(f"   ✅ SMARTEST PROCESSING COMPLETE: {Path(output_path).name}")
            
            return True, design_preservation, original_artifacts
            
        except Exception as e:
            print(f"❌ Smartest processing failed for {Path(input_path).name}: {e}")
            return False, 0, 0
    
    def batch_smartest_process(self, input_dir):
        """🧠 Batch process with maximum intelligence"""
        print("🧠 STARTING THE SMARTEST ARTIFACT DESTRUCTION EVER CREATED")
        print("🤖 USING: Multi-AI Ensemble + Deep Learning + Computer Vision")
        print("🎯 TARGET: COMPLETE ARTIFACT ANNIHILATION WITH PERFECT DESIGN PRESERVATION")
        
        input_path = Path(input_dir)
        
        # Find all image files
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}
        image_files = [f for f in input_path.iterdir() 
                      if f.suffix.lower() in image_extensions and 'backup' not in str(f)]
        
        if not image_files:
            print("❌ No image files found")
            return
        
        print(f"🧠 Found {len(image_files)} images for SMARTEST PROCESSING")
        
        results = {
            'success': 0, 
            'failed': 0, 
            'total_artifacts_destroyed': 0,
            'avg_design_preservation': 0,
            'processed_files': []
        }
        
        design_preservations = []
        
        for i, img_file in enumerate(image_files, 1):
            print(f"\n🧠 SMARTEST PROGRESS: {i}/{len(image_files)}")
            
            # Create temporary output
            temp_output = img_file.parent / f"smartest_{img_file.name}"
            
            success, design_preservation, artifacts_destroyed = self.smartest_process_image(
                str(img_file), str(temp_output)
            )
            
            if success:
                # Replace original with processed version
                temp_output.replace(img_file)
                results['success'] += 1
                results['total_artifacts_destroyed'] += artifacts_destroyed
                results['processed_files'].append({
                    'file': img_file.name,
                    'design_preservation': design_preservation,
                    'artifacts_destroyed': artifacts_destroyed
                })
                design_preservations.append(design_preservation)
            else:
                results['failed'] += 1
                if temp_output.exists():
                    temp_output.unlink()
        
        # Calculate final statistics
        if design_preservations:
            results['avg_design_preservation'] = np.mean(design_preservations)
        
        print(f"\n🧠 SMARTEST ARTIFACT DESTRUCTION COMPLETE!")
        print(f"✅ Successfully processed: {results['success']}")
        print(f"❌ Failed: {results['failed']}")
        print(f"🧹 Total artifacts destroyed: {results['total_artifacts_destroyed']}")
        print(f"🎨 Average design preservation: {results['avg_design_preservation']:.1f}%")
        
        if results['processed_files']:
            print(f"\n🧠 SMARTEST RESULTS:")
            for file_result in results['processed_files']:
                print(f"   🎯 {file_result['file']}: "
                      f"{file_result['design_preservation']:.1f}% preserved, "
                      f"{file_result['artifacts_destroyed']} artifacts destroyed")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='🧠 Smartest Artifact Destroyer')
    parser.add_argument('input', help='Input directory with images to process')
    
    args = parser.parse_args()
    
    destroyer = SmartestArtifactDestroyer()
    destroyer.batch_smartest_process(args.input)

if __name__ == '__main__':
    main()
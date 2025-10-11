#!/usr/bin/env python3
"""
Artifact Analyzer
Detects and analyzes remaining artifacts in processed images
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image
from pathlib import Path
import argparse

class ArtifactAnalyzer:
    """Analyzes remaining artifacts in processed images"""
    
    def __init__(self):
        pass
    
    def analyze_artifacts(self, image_path):
        """Analyze artifacts in a single image"""
        print(f"🔍 Analyzing artifacts: {Path(image_path).name}")
        
        img = Image.open(image_path).convert('RGBA')
        img_array = np.array(img)
        
        # Extract channels
        rgb = img_array[:, :, :3]
        alpha = img_array[:, :, 3]
        
        height, width = alpha.shape
        total_pixels = height * width
        
        # Analyze alpha channel artifacts
        artifacts = self.detect_alpha_artifacts(alpha)
        
        # Analyze color artifacts in semi-transparent areas
        color_artifacts = self.detect_color_artifacts(rgb, alpha)
        
        # Analyze edge artifacts
        edge_artifacts = self.detect_edge_artifacts(rgb, alpha)
        
        # Analyze noise artifacts
        noise_artifacts = self.detect_noise_artifacts(alpha)
        
        analysis = {
            'file': Path(image_path).name,
            'total_pixels': total_pixels,
            'alpha_artifacts': artifacts,
            'color_artifacts': color_artifacts,
            'edge_artifacts': edge_artifacts,
            'noise_artifacts': noise_artifacts,
            'artifact_score': self.calculate_artifact_score(artifacts, color_artifacts, edge_artifacts, noise_artifacts)
        }
        
        self.print_analysis(analysis)
        return analysis
    
    def detect_alpha_artifacts(self, alpha):
        """Detect artifacts in alpha channel"""
        total_pixels = alpha.size
        
        # Count different alpha ranges
        fully_transparent = np.sum(alpha == 0)
        fully_opaque = np.sum(alpha == 255)
        semi_transparent = np.sum((alpha > 0) & (alpha < 255))
        
        # Detect problematic semi-transparent regions
        very_low_alpha = np.sum((alpha > 0) & (alpha < 50))  # Likely artifacts
        medium_alpha = np.sum((alpha >= 50) & (alpha < 200))  # Potentially artifacts
        high_alpha = np.sum((alpha >= 200) & (alpha < 255))  # Likely legitimate
        
        # Detect isolated pixels (noise)
        alpha_binary = (alpha > 0).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        opened = cv2.morphologyEx(alpha_binary, cv2.MORPH_OPEN, kernel)
        isolated_pixels = np.sum(alpha_binary) - np.sum(opened)
        
        return {
            'fully_transparent': fully_transparent,
            'fully_opaque': fully_opaque,
            'semi_transparent': semi_transparent,
            'very_low_alpha': very_low_alpha,
            'medium_alpha': medium_alpha,
            'high_alpha': high_alpha,
            'isolated_pixels': isolated_pixels,
            'semi_transparent_ratio': semi_transparent / total_pixels,
            'artifact_ratio': very_low_alpha / total_pixels if total_pixels > 0 else 0
        }
    
    def detect_color_artifacts(self, rgb, alpha):
        """Detect color artifacts in semi-transparent areas"""
        # Focus on semi-transparent areas
        semi_mask = (alpha > 0) & (alpha < 255)
        
        if not np.any(semi_mask):
            return {'has_artifacts': False, 'artifact_pixels': 0}
        
        # Extract colors in semi-transparent areas
        semi_colors = rgb[semi_mask]
        
        # Detect unusual colors (likely background remnants)
        # Convert to HSV for better analysis
        if len(semi_colors) > 0:
            hsv_colors = cv2.cvtColor(semi_colors.reshape(1, -1, 3), cv2.COLOR_RGB2HSV).reshape(-1, 3)
            
            # Detect low saturation colors (grayish - likely background)
            low_saturation = np.sum(hsv_colors[:, 1] < 30)  # Very low saturation
            
            # Detect very bright or very dark colors (likely artifacts)
            very_bright = np.sum(hsv_colors[:, 2] > 240)
            very_dark = np.sum(hsv_colors[:, 2] < 20)
            
            artifact_pixels = low_saturation + very_bright + very_dark
            
            return {
                'has_artifacts': artifact_pixels > len(semi_colors) * 0.1,  # More than 10%
                'artifact_pixels': artifact_pixels,
                'total_semi_pixels': len(semi_colors),
                'low_saturation': low_saturation,
                'very_bright': very_bright,
                'very_dark': very_dark
            }
        
        return {'has_artifacts': False, 'artifact_pixels': 0}
    
    def detect_edge_artifacts(self, rgb, alpha):
        """Detect artifacts around edges"""
        # Create edge mask
        alpha_binary = (alpha > 0).astype(np.uint8) * 255
        edges = cv2.Canny(alpha_binary, 50, 150)
        
        # Dilate edges to create border region
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        edge_region = cv2.dilate(edges, kernel, iterations=2)
        
        # Analyze colors in edge region
        edge_mask = (edge_region > 0) & (alpha > 0)
        
        if not np.any(edge_mask):
            return {'has_artifacts': False, 'artifact_pixels': 0}
        
        edge_colors = rgb[edge_mask]
        edge_alphas = alpha[edge_mask]
        
        # Detect problematic edge pixels
        # Very low alpha with visible color (likely artifacts)
        low_alpha_with_color = np.sum((edge_alphas < 100) & (np.max(edge_colors, axis=1) > 50))
        
        return {
            'has_artifacts': low_alpha_with_color > len(edge_colors) * 0.05,
            'artifact_pixels': low_alpha_with_color,
            'total_edge_pixels': len(edge_colors),
            'edge_region_size': np.sum(edge_region > 0)
        }
    
    def detect_noise_artifacts(self, alpha):
        """Detect noise artifacts"""
        # Apply median filter to detect noise
        filtered = cv2.medianBlur(alpha, 5)
        noise_mask = np.abs(alpha.astype(np.int16) - filtered.astype(np.int16)) > 20
        
        # Count noise pixels
        noise_pixels = np.sum(noise_mask)
        
        # Detect salt and pepper noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        opened = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, kernel)
        closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)
        
        salt_pepper = np.sum(np.abs(alpha.astype(np.int16) - closed.astype(np.int16)) > 10)
        
        return {
            'noise_pixels': noise_pixels,
            'salt_pepper_pixels': salt_pepper,
            'has_noise': noise_pixels > alpha.size * 0.01  # More than 1%
        }
    
    def calculate_artifact_score(self, alpha_artifacts, color_artifacts, edge_artifacts, noise_artifacts):
        """Calculate overall artifact score (0-100, lower is better)"""
        score = 0
        
        # Alpha artifacts (40% weight)
        if alpha_artifacts['artifact_ratio'] > 0.1:
            score += 40
        elif alpha_artifacts['artifact_ratio'] > 0.05:
            score += 20
        elif alpha_artifacts['artifact_ratio'] > 0.02:
            score += 10
        
        # Color artifacts (30% weight)
        if color_artifacts.get('has_artifacts', False):
            score += 30
        
        # Edge artifacts (20% weight)
        if edge_artifacts.get('has_artifacts', False):
            score += 20
        
        # Noise artifacts (10% weight)
        if noise_artifacts.get('has_noise', False):
            score += 10
        
        return min(score, 100)
    
    def print_analysis(self, analysis):
        """Print detailed analysis"""
        print(f"   📊 Artifact Analysis for {analysis['file']}:")
        
        # Alpha artifacts
        alpha = analysis['alpha_artifacts']
        print(f"   🔍 Alpha Channel:")
        print(f"      - Semi-transparent: {alpha['semi_transparent_ratio']:.1%}")
        print(f"      - Low alpha artifacts: {alpha['very_low_alpha']} pixels")
        print(f"      - Isolated pixels: {alpha['isolated_pixels']} pixels")
        
        # Color artifacts
        color = analysis['color_artifacts']
        if color.get('has_artifacts', False):
            print(f"   🎨 Color Artifacts: ⚠️ DETECTED")
            print(f"      - Artifact pixels: {color['artifact_pixels']}")
            print(f"      - Low saturation: {color.get('low_saturation', 0)}")
        else:
            print(f"   🎨 Color Artifacts: ✅ Clean")
        
        # Edge artifacts
        edge = analysis['edge_artifacts']
        if edge.get('has_artifacts', False):
            print(f"   📏 Edge Artifacts: ⚠️ DETECTED")
            print(f"      - Artifact pixels: {edge['artifact_pixels']}")
        else:
            print(f"   📏 Edge Artifacts: ✅ Clean")
        
        # Noise artifacts
        noise = analysis['noise_artifacts']
        if noise.get('has_noise', False):
            print(f"   🔊 Noise Artifacts: ⚠️ DETECTED")
            print(f"      - Noise pixels: {noise['noise_pixels']}")
        else:
            print(f"   🔊 Noise Artifacts: ✅ Clean")
        
        # Overall score
        score = analysis['artifact_score']
        if score == 0:
            status = "✅ CLEAN"
        elif score < 20:
            status = "🟡 MINOR ARTIFACTS"
        elif score < 50:
            status = "🟠 MODERATE ARTIFACTS"
        else:
            status = "🔴 HEAVY ARTIFACTS"
        
        print(f"   📈 Artifact Score: {score}/100 - {status}")
    
    def analyze_batch(self, input_dir):
        """Analyze all images in directory"""
        print("🔍 Starting artifact analysis...")
        
        input_path = Path(input_dir)
        
        # Find all image files (excluding backup)
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}
        image_files = [f for f in input_path.iterdir() 
                      if f.suffix.lower() in image_extensions and 'backup' not in str(f)]
        
        if not image_files:
            print("❌ No image files found")
            return
        
        print(f"📊 Analyzing {len(image_files)} images for artifacts...")
        
        results = []
        artifact_files = []
        clean_files = []
        
        for i, img_file in enumerate(image_files, 1):
            print(f"\n📈 Progress: {i}/{len(image_files)}")
            
            try:
                analysis = self.analyze_artifacts(str(img_file))
                results.append(analysis)
                
                if analysis['artifact_score'] > 10:  # Has significant artifacts
                    artifact_files.append(analysis)
                else:
                    clean_files.append(analysis)
                    
            except Exception as e:
                print(f"❌ Error analyzing {img_file.name}: {e}")
        
        # Summary
        print(f"\n📊 Artifact Analysis Summary:")
        print(f"   📁 Total files: {len(results)}")
        print(f"   ✅ Clean files: {len(clean_files)}")
        print(f"   ⚠️ Files with artifacts: {len(artifact_files)}")
        
        if artifact_files:
            print(f"\n🧹 Files needing cleanup:")
            for analysis in sorted(artifact_files, key=lambda x: x['artifact_score'], reverse=True):
                score = analysis['artifact_score']
                print(f"   🔴 {analysis['file']}: {score}/100")
        
        return results, artifact_files, clean_files

def main():
    parser = argparse.ArgumentParser(description='Artifact Analysis Tool')
    parser.add_argument('input', help='Input directory with images to analyze')
    
    args = parser.parse_args()
    
    analyzer = ArtifactAnalyzer()
    analyzer.analyze_batch(args.input)

if __name__ == '__main__':
    main()
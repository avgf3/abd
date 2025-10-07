#!/usr/bin/env python3
import requests
import os
from PIL import Image, ImageEnhance
import re

# URLs provided by user
urls = [
    "https://ibb.co/Ps07Fxqb",
    "https://ibb.co/0Rc8xhV6", 
    "https://ibb.co/W4FFYZdg",
    "https://ibb.co/XZ8bj6DB",
    "https://ibb.co/5W2SKdm1",
    "https://ibb.co/qMTzGKbH",
    "https://ibb.co/xSndc0T1",
    "https://ibb.co/JRQ9Rkwc",
    "https://ibb.co/Cj6P5V6",
    "https://ibb.co/G3F4djcK",
    "https://ibb.co/5X0D4Y29",
    "https://ibb.co/zW1mhJLd",
    "https://ibb.co/gMm7THj4",
    "https://ibb.co/k64mT393",
    "https://ibb.co/0R2wLvVK"
]

def get_direct_image_url(ibb_url):
    """Convert ibb.co URL to direct image URL by scraping the page"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(ibb_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        patterns = [
            r'<meta property="og:image" content="([^"]+)"',
            r'data-src="([^"]+)"',
            r'src="(https://i\.ibb\.co/[^"]+)"',
            r'"url":"(https://i\.ibb\.co/[^"]+)"'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, response.text)
            if matches:
                return matches[0]
        
        return None
    except Exception as e:
        print(f"Error getting direct URL for {ibb_url}: {e}")
        return None

def download_image(url, filename):
    """Download image from URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, stream=True, headers=headers, timeout=60)
        response.raise_for_status()
        
        with open(filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False

def simple_background_removal(image_path, output_path):
    """Simple background removal without using rembg"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGBA
            img = img.convert('RGBA')
            
            # Get image data
            data = img.getdata()
            
            # Create new data with transparency
            new_data = []
            
            # Get the background color (assume it's the color of the corner pixels)
            bg_colors = [
                img.getpixel((0, 0)),
                img.getpixel((img.width-1, 0)),
                img.getpixel((0, img.height-1)),
                img.getpixel((img.width-1, img.height-1))
            ]
            
            # Find the most common background color
            from collections import Counter
            bg_color = Counter(bg_colors).most_common(1)[0][0]
            
            # Remove background
            for item in data:
                # If pixel is similar to background color, make it transparent
                if abs(item[0] - bg_color[0]) < 30 and abs(item[1] - bg_color[1]) < 30 and abs(item[2] - bg_color[2]) < 30:
                    new_data.append((255, 255, 255, 0))  # Transparent
                else:
                    new_data.append(item)
            
            # Create new image
            img.putdata(new_data)
            img.save(output_path, 'PNG')
            
        return True
    except Exception as e:
        print(f"Error in simple background removal for {image_path}: {e}")
        return False

def process_frame_simple(image_path, output_path, target_size=(212, 236)):
    """Process frame without background removal - just resize and optimize"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGBA
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Resize maintaining aspect ratio
            img.thumbnail(target_size, Image.Resampling.LANCZOS)
            
            # Create new image with target size and transparent background
            new_img = Image.new('RGBA', target_size, (0, 0, 0, 0))
            
            # Center the resized image
            x = (target_size[0] - img.width) // 2
            y = (target_size[1] - img.height) // 2
            new_img.paste(img, (x, y), img)
            
            # Enhance the image
            enhancer = ImageEnhance.Sharpness(new_img)
            new_img = enhancer.enhance(1.2)
            
            # Save as WebP with high quality
            new_img.save(output_path, 'WEBP', quality=95, method=6)
        
        return True
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return False

def main():
    # Create directories
    temp_dir = "/workspace/temp_frames_fix"
    output_dir = "/workspace/client/public/frames"
    
    os.makedirs(temp_dir, exist_ok=True)
    
    target_size = (212, 236)
    
    # Process each URL
    for i, url in enumerate(urls, 7):
        print(f"\nProcessing frame {i}...")
        
        # Get direct image URL
        direct_url = get_direct_image_url(url)
        if not direct_url:
            print(f"Could not get direct URL for frame {i}")
            continue
            
        print(f"Direct URL: {direct_url}")
        
        # Download original image
        temp_original = f"{temp_dir}/frame{i}_original.jpg"
        if not download_image(direct_url, temp_original):
            print(f"Failed to download frame {i}")
            continue
        
        # Process frame (resize and optimize without aggressive background removal)
        final_output = f"{output_dir}/frame{i}.webp"
        if process_frame_simple(temp_original, final_output, target_size):
            print(f"Successfully created {final_output}")
        else:
            print(f"Failed to process frame {i}")
    
    # Clean up temp directory
    import shutil
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    print("\nProcessing complete!")

if __name__ == "__main__":
    main()
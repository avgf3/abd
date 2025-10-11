#!/bin/bash

# Advanced Tag Background Removal Runner
# Combines multiple AI models for the best results

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directories
TAGS_DIR="client/public/tags"
BACKUP_DIR="client/public/tags/backup_original"
TEMP_DIR="tools/temp"

echo -e "${PURPLE}🎨 Advanced Tag Background Removal System${NC}"
echo -e "${PURPLE}===========================================${NC}"

# Check if directories exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Backup directory not found: $BACKUP_DIR${NC}"
    exit 1
fi

if [ ! -d "$TAGS_DIR" ]; then
    echo -e "${YELLOW}⚠️ Creating tags directory: $TAGS_DIR${NC}"
    mkdir -p "$TAGS_DIR"
fi

# Create temp directory
mkdir -p "$TEMP_DIR"

echo -e "${BLUE}📁 Input (Backup): $BACKUP_DIR${NC}"
echo -e "${BLUE}📁 Output (Tags): $TAGS_DIR${NC}"

# Count files to process
file_count=$(find "$BACKUP_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" -o -iname "*.bmp" -o -iname "*.tiff" \) | wc -l)

if [ "$file_count" -eq 0 ]; then
    echo -e "${RED}❌ No image files found in backup directory${NC}"
    exit 1
fi

echo -e "${CYAN}📊 Found $file_count tag images to process${NC}"

# Method selection
echo -e "\n${YELLOW}🤖 Available processing methods:${NC}"
echo -e "${YELLOW}1. Hybrid (JavaScript + Python) - Best quality${NC}"
echo -e "${YELLOW}2. Python rembg only - Fastest${NC}"
echo -e "${YELLOW}3. JavaScript only - Good balance${NC}"
echo -e "${YELLOW}4. Compare all methods - For testing${NC}"

read -p "Select method (1-4) [default: 1]: " method
method=${method:-1}

case $method in
    1)
        echo -e "\n${GREEN}🚀 Using Hybrid approach (Best Quality)${NC}"
        echo -e "${CYAN}This combines multiple AI models for optimal results${NC}"
        
        # Run the comprehensive JavaScript processor
        node tools/process-tags-background.js
        ;;
        
    2)
        echo -e "\n${GREEN}🐍 Using Python rembg (Fastest)${NC}"
        echo -e "${CYAN}Using the most advanced rembg model${NC}"
        
        # Run Python processor
        python3 tools/rembg_processor.py "$BACKUP_DIR" "$TAGS_DIR" --model u2net --quality ultra
        ;;
        
    3)
        echo -e "\n${GREEN}⚡ Using JavaScript only (Balanced)${NC}"
        echo -e "${CYAN}Using @imgly/background-removal${NC}"
        
        # Run JavaScript processor
        node tools/advanced-background-removal.js "$BACKUP_DIR" "$TAGS_DIR" ultra
        ;;
        
    4)
        echo -e "\n${GREEN}🔬 Comparing all methods${NC}"
        echo -e "${CYAN}This will process with all methods for comparison${NC}"
        
        # Create comparison directories
        mkdir -p "$TEMP_DIR/comparison/hybrid"
        mkdir -p "$TEMP_DIR/comparison/rembg"
        mkdir -p "$TEMP_DIR/comparison/imgly"
        
        # Test with first image
        first_image=$(find "$BACKUP_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" \) | head -1)
        
        if [ -n "$first_image" ]; then
            echo -e "${BLUE}🧪 Testing with: $(basename "$first_image")${NC}"
            
            # Method 1: rembg
            echo -e "${YELLOW}Testing rembg...${NC}"
            python3 tools/rembg_processor.py "$first_image" "$TEMP_DIR/comparison/rembg/$(basename "$first_image" | sed 's/\.[^.]*$/.png/')" --model u2net --quality ultra
            
            # Method 2: JavaScript
            echo -e "${YELLOW}Testing JavaScript...${NC}"
            node tools/advanced-background-removal.js "$first_image" "$TEMP_DIR/comparison/imgly/$(basename "$first_image" | sed 's/\.[^.]*$/.png/')" ultra
            
            echo -e "${GREEN}✅ Comparison complete! Check results in: $TEMP_DIR/comparison/${NC}"
            echo -e "${CYAN}Choose the best method and run again with that option${NC}"
        else
            echo -e "${RED}❌ No test image found${NC}"
        fi
        ;;
        
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac

# Verify results if processing was done
if [ "$method" != "4" ]; then
    echo -e "\n${BLUE}🔍 Verifying results...${NC}"
    
    processed_count=$(find "$TAGS_DIR" -type f \( -iname "*.png" -o -iname "*.webp" \) | wc -l)
    
    echo -e "${GREEN}📊 Processing Summary:${NC}"
    echo -e "${GREEN}  Original files: $file_count${NC}"
    echo -e "${GREEN}  Processed files: $processed_count${NC}"
    
    if [ "$processed_count" -eq "$file_count" ]; then
        echo -e "${GREEN}✅ All files processed successfully!${NC}"
    else
        echo -e "${YELLOW}⚠️ Some files may not have been processed${NC}"
    fi
    
    # Show file sizes comparison
    echo -e "\n${BLUE}📈 File Size Analysis:${NC}"
    original_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    processed_size=$(du -sh "$TAGS_DIR" | cut -f1)
    echo -e "${BLUE}  Original (with backgrounds): $original_size${NC}"
    echo -e "${BLUE}  Processed (transparent): $processed_size${NC}"
fi

# Cleanup
echo -e "\n${YELLOW}🧹 Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"

echo -e "\n${PURPLE}🎉 Background removal process completed!${NC}"
echo -e "${CYAN}Your tag images are now ready with transparent backgrounds${NC}"
echo -e "${CYAN}Location: $TAGS_DIR${NC}"
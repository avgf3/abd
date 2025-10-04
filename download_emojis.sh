#!/bin/bash

# قائمة الروابط
urls=(
"https://ibb.co/20cPHjYC"
"https://ibb.co/wVVdgc1"
"https://ibb.co/ZRpJRZsr"
"https://ibb.co/5g4Gmz9C"
"https://ibb.co/4n0RpcTb"
"https://ibb.co/MkS0vZNz"
"https://ibb.co/ccNJ6DtM"
"https://ibb.co/B58kPhn1"
"https://ibb.co/ZpxDRnk7"
"https://ibb.co/CstNcrdH"
"https://ibb.co/WrYf8Md"
"https://ibb.co/tpYQrc9B"
"https://ibb.co/ymQSvSn6"
"https://ibb.co/7x318qMw"
"https://ibb.co/DHJ5XbwY"
"https://ibb.co/Y7bSCTGP"
"https://ibb.co/cK0GF2Mb"
"https://ibb.co/nNgZ2wsG"
"https://ibb.co/LD5ph5VG"
"https://ibb.co/Y7Vkcqqn"
"https://ibb.co/GvYdfs3z"
"https://ibb.co/5hH22Rym"
"https://ibb.co/hxkN5NNT"
"https://ibb.co/S44XbT4x"
"https://ibb.co/XrSyd4Fs"
"https://ibb.co/XGkjVgV"
"https://ibb.co/wF0H06R8"
"https://ibb.co/sJbhjDY6"
"https://ibb.co/1YLxsM3y"
"https://ibb.co/5h98hjpr"
"https://ibb.co/4g321tjg"
"https://ibb.co/5gtkQfhJ"
"https://ibb.co/TxZ00FS4"
"https://ibb.co/LdhQ3ZW4"
"https://ibb.co/PGtGfyYp"
"https://ibb.co/KjRfD4YH"
"https://ibb.co/5hkHMWnk"
"https://ibb.co/Q77sdfCV"
"https://ibb.co/XkMJB4Y3"
"https://ibb.co/zVrPr5Sk"
"https://ibb.co/cXJMg7zs"
"https://ibb.co/gFjVpCp8"
"https://ibb.co/gL0JB4z0"
"https://ibb.co/gZmvf26h"
"https://ibb.co/KzhPtRw3"
"https://ibb.co/N6Fq72LV"
"https://ibb.co/WWhLncv1"
"https://ibb.co/QFCBtjPy"
"https://ibb.co/G4HZXPxC"
"https://ibb.co/mCMZ2fmD"
"https://ibb.co/pvj9NknM"
"https://ibb.co/xtHGtV2t"
"https://ibb.co/gFtR82QG"
"https://ibb.co/wN5BBMvf"
"https://ibb.co/rf1kM2YK"
"https://ibb.co/FLqngW5H"
"https://ibb.co/0pnGpXgM"
"https://ibb.co/gZqbmqd6"
"https://ibb.co/gpsH88Y"
"https://ibb.co/xSF9qrkR"
"https://ibb.co/d91f0NW"
"https://ibb.co/TBTThTP7"
"https://ibb.co/LD02Vk9m"
"https://ibb.co/G4WPRxj3"
"https://ibb.co/h1cmBVsp"
"https://ibb.co/99fhS2hL"
"https://ibb.co/LzBvtS3c"
"https://ibb.co/9mCH0smT"
"https://ibb.co/vC4TmFYD"
"https://ibb.co/pvQ8Vjh6"
"https://ibb.co/JwbDWcHR"
"https://ibb.co/Xf21KNHM"
"https://ibb.co/MktqDRjM"
"https://ibb.co/0p9xF13Q"
)

output_dir="/workspace/client/public/assets/emojis/custom"
mkdir -p "$output_dir"

counter=1
for url in "${urls[@]}"; do
    echo "Downloading emoji $counter..."
    # استخراج رابط الصورة المباشر من صفحة imgbb
    direct_url=$(curl -s "$url" | grep -oP 'property="og:image" content="\K[^"]+' | head -1)
    
    if [ ! -z "$direct_url" ]; then
        # تحديد امتداد الملف
        ext="${direct_url##*.}"
        ext="${ext%%\?*}"
        
        # تحميل الصورة
        curl -s -L "$direct_url" -o "$output_dir/emoji_$counter.$ext"
        echo "✓ Downloaded emoji_$counter.$ext"
    else
        echo "✗ Failed to download from $url"
    fi
    
    ((counter++))
done

echo "Done! Downloaded $(ls -1 $output_dir | wc -l) emojis"

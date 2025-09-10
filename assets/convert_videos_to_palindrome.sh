#!/bin/bash

# Process all MP4 files in portraits directory
find portraits -type f -name "*.mp4" -print0 | while IFS= read -r -d '' video; do
    echo "Processing: $video"
    
    # Create backup
    cp "$video" "${video}.bak"
    echo "  Created backup: ${video}.bak"
    
    # Apply ffmpeg filter (reverse and concatenate)
    ffmpeg -i "${video}.bak" -filter_complex "[0:v]reverse[r];[0:v][r]concat=n=2:v=1[v]" -map "[v]" -y "$video" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "  ✓ Successfully processed $video"
    else
        echo "  ✗ Error processing $video"
        # Restore from backup if ffmpeg failed
        mv "${video}.bak" "$video"
        echo "  Restored from backup"
    fi
done

echo "All videos processed!"
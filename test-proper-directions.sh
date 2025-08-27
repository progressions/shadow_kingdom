#!/bin/bash
echo "Testing proper north/south navigation..."
echo -e "go south\ngo south\nlook\ngo south\nlook\ngo north\nlook\nquit\n" | timeout 5 npm start 2>&1 | grep -E "(You move|crystalline|Castle Gatehouse|Exits:|Location:)"
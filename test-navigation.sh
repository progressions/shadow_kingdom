#!/bin/bash
echo "Testing navigation to AI region and back..."
npm run dev -- --cmd "go south" --cmd "go south" --cmd "go south" --cmd "look" --cmd "go northwest" --cmd "look" --debug | grep -E "(You move|crystalline|Castle Gatehouse|Exits:)"
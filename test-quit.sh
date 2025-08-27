#!/bin/bash
echo "Testing quit command..."
echo -e "quit\n" | timeout 3 npm start 2>&1 | tail -20
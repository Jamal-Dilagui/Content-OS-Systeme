#!/bin/bash
# Reliable dev server launcher with memory limits + auto-restart
cd /home/z/my-project

# Kill any existing
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
sleep 2
rm -rf .next

# Limit Node memory to avoid OOM kills (sandbox has 4GB total)
export NODE_OPTIONS="--max-old-space-size=512 --max-semi-space-size=64"

# Start fully detached
exec ./node_modules/.bin/next dev -p 3000 --webpack > dev.log 2>&1

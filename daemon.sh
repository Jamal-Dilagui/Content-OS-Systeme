#!/bin/bash
# Daemon script - double fork to fully detach from shell
cd /home/z/my-project
pkill -9 -f "next dev" 2>/dev/null
sleep 2
rm -rf .next

# Double-fork daemon pattern
(
  exec ./node_modules/.bin/next dev -p 3000 --webpack > dev.log 2>&1
) &
echo $! > /tmp/next-dev.pid

#!/bin/bash
# Healthcheck — restart server if it died
cd /home/z/my-project

if ! ss -tlnp 2>/dev/null | grep -q ":3000 "; then
  # Server is down — restart it
  pkill -9 -f "next-server" 2>/dev/null
  pkill -9 -f "next dev" 2>/dev/null
  sleep 1
  rm -rf .next
  export NODE_OPTIONS="--max-old-space-size=512 --max-semi-space-size=64"
  setsid bash -c 'cd /home/z/my-project && exec ./node_modules/.bin/next dev -p 3000 --webpack > dev.log 2>&1' < /dev/null > /dev/null 2>&1 &
  disown -a
  echo "$(date): server restarted" >> /home/z/my-project/healthcheck.log
fi

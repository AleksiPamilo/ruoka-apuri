#!/usr/bin/env bash
set -e

DEVICE_A="6CFB6930-D225-4A77-9B4B-B1BE6CBF6092" # iPhone 17 Pro Max
DEVICE_B="49EF4955-DB55-4DA2-AC1C-C38FDC7E23AC" # iPhone 17
SCHEME="com.anonymous.ruoka-apuri"

xcrun simctl boot "$DEVICE_A" 2>/dev/null || true
xcrun simctl boot "$DEVICE_B" 2>/dev/null || true
open -a Simulator

echo "Building & installing on iPhone 17 Pro Max (starts Metro)..."
npx expo run:ios --device "$DEVICE_A" &
FIRST_PID=$!

echo "Waiting for Metro bundler on port 8081..."
until curl -s http://localhost:8081/status 2>/dev/null | grep -q "packager-status"; do
  sleep 1
done

echo "Building & installing on iPhone 17 (reusing running Metro)..."
# expo run:ios's own "open dev client" step is unreliable with two booted
# simulators (it can target the wrong one), so install only here...
npx expo run:ios --device "$DEVICE_B" --no-bundler || true

# ...and force-connect the correct device ourselves.
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
if [ -n "$LAN_IP" ]; then
  sleep 2
  echo "Connecting iPhone 17 to Metro at $LAN_IP..."
  xcrun simctl openurl "$DEVICE_B" "${SCHEME}://expo-development-client/?url=http%3A%2F%2F${LAN_IP}%3A8081"
fi

wait "$FIRST_PID"

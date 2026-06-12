#!/bin/bash
set -euo pipefail

# Scripts to pair and validate an iOS device via Wi-Fi

echo -e "\n[Bash] Make sure your iOS device is unlocked and the Trust dialog has been accepted."

# Try to pair
if ! idevicepair pair; then
    echo -e "\n[Bash] Error: Failed to pair iOS device. Make sure it's unlocked and you selected 'Trust'."
    exit 1
fi

echo -e "\n[Bash] Validating pairing..."
VALIDATION=$(idevicepair validate)

if echo "$VALIDATION" | grep -q "SUCCESS"; then
    echo -e "\n[Bash] Device successfully paired and validated."
else
    echo -e "\n[Bash] Error: Validation failed. Please try again."
    exit 1
fi

echo -e "\n[Bash] You must also enable 'Connect via network' for your device in Xcode (Window -> Devices and Simulators)."
echo -e "[Bash] Disconnect USB once the network icon appears next to your device in Xcode."

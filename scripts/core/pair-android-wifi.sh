#!/bin/bash
set -euo pipefail

# Scripts to pair and connect an Android device over Wi-Fi

MODE=$1

if [[ "$MODE" == "wireless" ]]; then
    PAIRING_IP_PORT=$2
    PAIRING_CODE=$3
    CONNECT_IP_PORT=$4

    echo -e "\n[Bash] Pairing device..."
    # Timeout after 15 seconds if it fails to pair
    if ! timeout 15 adb pair "$PAIRING_IP_PORT" "$PAIRING_CODE"; then
        echo -e "\n[Bash] Error: Failed to pair with device at $PAIRING_IP_PORT"
        exit 1
    fi

    echo -e "\n[Bash] Connecting to device..."
    if ! timeout 15 adb connect "$CONNECT_IP_PORT"; then
        echo -e "\n[Bash] Error: Failed to connect to device at $CONNECT_IP_PORT"
        exit 1
    fi

    echo -e "\n[Bash] Successfully connected via Wireless Debugging!"

elif [[ "$MODE" == "tcpip" ]]; then
    DEVICE_IP=$2

    echo -e "\n[Bash] Restarting ADB in TCP mode on port 5555..."
    adb start-server
    adb tcpip 5555

    echo -e "\n[Bash] Waiting for ADB to restart..."
    sleep 3

    echo -e "\n[Bash] Connecting to device at $DEVICE_IP:5555..."
    # Capture output to check for "failed" string since adb connect often returns 0 on failure
    CONNECT_OUT=$(timeout 15 adb connect "$DEVICE_IP:5555" 2>&1 || echo "failed timeout")

    if echo "$CONNECT_OUT" | grep -iE 'failed|cannot connect|offline|error'; then
        echo -e "\n[Bash] Error: Failed to connect to device at $DEVICE_IP:5555\nOutput: $CONNECT_OUT"
        exit 1
    fi

    echo -e "\n[Bash] Successfully connected via traditional Wi-Fi debugging!"
    echo -e "[Bash] You may now disconnect the USB cable."

else
    echo -e "\n[Bash] Invalid mode: $MODE"
    exit 1
fi

#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-all}"

clean_android() {
    echo "Cleaning Android caches..."
    rm -rf android/app/build/ || true
    rm -rf android/.gradle/ || true
    echo "Android caches cleaned."
}

clean_ios() {
    echo "Cleaning iOS caches..."
    rm -rf ios/build/ || true
    rm -rf ios/Pods/ || true
    echo "iOS caches cleaned."
}

clean_metro() {
    echo "Cleaning Metro Bundler caches..."
    rm -rf "${TMPDIR:-/tmp}/metro-*" || true
    rm -rf "${TMPDIR:-/tmp}/haste-map-*" || true
    echo "Metro Bundler caches cleaned."
}

clean_capo() {
    echo "Cleaning Capo CLI staging folders..."
    rm -rf .tmp/ || true
    echo "Capo CLI staging folders cleaned."
}

case "$TARGET" in
    android)
        clean_android
        ;;
    ios)
        clean_ios
        ;;
    metro)
        clean_metro
        ;;
    capo)
        clean_capo
        ;;
    all)
        clean_android
        clean_ios
        clean_metro
        clean_capo
        ;;
    *)
        echo "Unknown target: $TARGET. Usage: $0 [android|ios|metro|capo|all]"
        exit 1
        ;;
esac

#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
    echo "Usage: $0 <TARGET_DIR> [<OLD_BRAND>] <NEW_BRAND>"
    exit 1
fi

# Argument parsing for optional OLD_BRAND
if [ "$#" -eq 2 ]; then
    TARGET_DIR="$1"
    OLD_BRAND=""
    NEW_BRAND="$2"
else
    TARGET_DIR="$1"
    OLD_BRAND="$2"
    NEW_BRAND="$3"
fi

if [ ! -d "${TARGET_DIR}" ]; then
    echo "[Deep Rename] Fatal: Target directory '${TARGET_DIR}' does not exist."
    exit 1
fi

# Deduction Logic: If OLD_BRAND is empty, extract it dynamically
if [ -z "${OLD_BRAND}" ]; then
    echo "[Deep Rename] OLD_BRAND not explicitly provided. Attempting deduction..."

    if [ ! -f "${TARGET_DIR}/app.json" ]; then
        echo "[Deep Rename] Fatal: Cannot deduce active brand. '${TARGET_DIR}/app.json' is missing."
        exit 1
    fi

    # Temporarily disable fail-fast so we can catch node execution errors gracefully
    set +e
    OLD_BRAND=$(cd "${TARGET_DIR}" && node -p "require('./app.json').name" 2>/dev/null)
    set -e

    if [ -z "${OLD_BRAND}" ] || [ "${OLD_BRAND}" == "undefined" ]; then
        echo "[Deep Rename] Fatal: Could not extract 'name' property from '${TARGET_DIR}/app.json'."
        exit 1
    fi

    echo "[Deep Rename] Successfully deduced OLD_BRAND as '${OLD_BRAND}'."
fi

echo "[Deep Rename] Starting cycle in '${TARGET_DIR}'..."

# Idempotency Check: Exit early if the brands are identical
if [ "${OLD_BRAND}" == "${NEW_BRAND}" ]; then
    echo "[Deep Rename] OLD_BRAND (${OLD_BRAND}) matches NEW_BRAND. Nothing to mutate. Exiting gracefully."
    exit 0
fi

# Exporting variables to safely pass them into perl without quoting/escaping issues
export OLD="${OLD_BRAND}"
export NEW="${NEW_BRAND}"

# 1. iOS Replacements
echo "[Deep Rename] Processing iOS artifacts..."
if [ -d "${TARGET_DIR}/ios" ]; then
    # Target .pbxproj, Info.plist, Podfile, xcschemes, AppDelegate, and Firebase configs
    find "${TARGET_DIR}/ios" -type f \( -name "*.pbxproj" -o -name "Info.plist" -o -name "Podfile" -o -name "*.xcscheme" -o -name "AppDelegate.*" -o -name "*.plist" -o -name "*.json" \) -exec perl -pi -e 's/\Q$ENV{OLD}\E/$ENV{NEW}/g' {} +

    # Rename Directories and core project files
    if [ -d "${TARGET_DIR}/ios/${OLD_BRAND}" ]; then
        mv "${TARGET_DIR}/ios/${OLD_BRAND}" "${TARGET_DIR}/ios/${NEW_BRAND}"
    fi
    if [ -d "${TARGET_DIR}/ios/${OLD_BRAND}.xcodeproj" ]; then
        mv "${TARGET_DIR}/ios/${OLD_BRAND}.xcodeproj" "${TARGET_DIR}/ios/${NEW_BRAND}.xcodeproj"
    fi
    if [ -d "${TARGET_DIR}/ios/${OLD_BRAND}.xcworkspace" ]; then
        mv "${TARGET_DIR}/ios/${OLD_BRAND}.xcworkspace" "${TARGET_DIR}/ios/${NEW_BRAND}.xcworkspace"
    fi
    if [ -f "${TARGET_DIR}/ios/${NEW_BRAND}.xcodeproj/xcshareddata/xcschemes/${OLD_BRAND}.xcscheme" ]; then
        mv "${TARGET_DIR}/ios/${NEW_BRAND}.xcodeproj/xcshareddata/xcschemes/${OLD_BRAND}.xcscheme" "${TARGET_DIR}/ios/${NEW_BRAND}.xcodeproj/xcshareddata/xcschemes/${NEW_BRAND}.xcscheme"
    fi

    echo "[Deep Rename] iOS artifacts updated successfully."
else
    echo "[Deep Rename] Warning: No ios/ directory found. Skipping iOS."
fi

# 2. Android Replacements
echo "[Deep Rename] Processing Android artifacts..."
if [ -d "${TARGET_DIR}/android" ]; then
    # Target build.gradle, strings.xml, settings.gradle, Firebase configs, and Main components
    find "${TARGET_DIR}/android" -type f \( -name "build.gradle" -o -name "strings.xml" -o -name "settings.gradle" -o -name "MainActivity.*" -o -name "MainApplication.*" -o -name "*.json" \) -exec perl -pi -e 's/\Q$ENV{OLD}\E/$ENV{NEW}/g' {} +

    # Rename Android Java Package Directory
    LOWER_OLD=$(echo "$OLD_BRAND" | tr '[:upper:]' '[:lower:]')
    LOWER_NEW=$(echo "$NEW_BRAND" | tr '[:upper:]' '[:lower:]')
    if [ -d "${TARGET_DIR}/android/app/src/main/java/com/${LOWER_OLD}" ]; then
        mv "${TARGET_DIR}/android/app/src/main/java/com/${LOWER_OLD}" "${TARGET_DIR}/android/app/src/main/java/com/${LOWER_NEW}"
    fi

    echo "[Deep Rename] Android artifacts updated successfully."
else
    echo "[Deep Rename] Warning: No android/ directory found. Skipping Android."
fi

# 3. Root Level Replacements
echo "[Deep Rename] Processing Root artifacts..."
find "${TARGET_DIR}" -maxdepth 1 -type f \( -name "app.json" -o -name "package.json" \) -exec perl -pi -e 's/\Q$ENV{OLD}\E/$ENV{NEW}/g' {} +

# Synchronize Lockfile if present
echo "[Deep Rename] Synchronizing package manager lockfiles..."
if [ -f "${TARGET_DIR}/yarn.lock" ]; then
    (cd "${TARGET_DIR}" && yarn install || true)
elif [ -f "${TARGET_DIR}/package-lock.json" ]; then
    (cd "${TARGET_DIR}" && npm install || true)
fi

echo "[Deep Rename] Root artifacts updated successfully."

echo "[Deep Rename] Staging mutated files in Git..."
if [ -d "${TARGET_DIR}/.git" ]; then
    (cd "${TARGET_DIR}" && git add .)
    echo "[Deep Rename] Files staged successfully."
else
    echo "[Deep Rename] Warning: Not a git repository. Skipping staging."
fi

echo "[Deep Rename] Universal Deep Rename completed! Native brand is now '${NEW_BRAND}'."

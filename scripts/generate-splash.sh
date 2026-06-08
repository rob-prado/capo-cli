#!/usr/bin/env bash
set -euo pipefail

# Wrapper script to generate react-native-bootsplash assets and distribute them
# into flavor-specific Android directories, without permanently mutating the main/res folder.

if [ "$#" -lt 5 ]; then
    echo "Usage: $0 <PROJECT_DIR> <BRAND> <LOGO_PATH> <BG_COLOR> <FLAVOR_1> [FLAVOR_2...]"
    exit 1
fi

PROJECT_DIR="$1"
BRAND="$2"
LOGO_PATH="$3"
BG_COLOR="$4"
shift 4
TARGET_FLAVORS=("$@")

# Resolve absolute path for logo since we will change directory
ABS_LOGO_PATH="${LOGO_PATH}"
if [[ ! "${ABS_LOGO_PATH}" = /* ]]; then
    ABS_LOGO_PATH="${PWD}/${LOGO_PATH}"
fi

cd "${PROJECT_DIR}"

if [ ! -f "${ABS_LOGO_PATH}" ]; then
    echo "Error: Logo file not found at ${ABS_LOGO_PATH}"
    exit 1
fi

MAIN_RES_DIR="android/app/src/main/res"
MANIFEST="android/app/src/main/AndroidManifest.xml"
BACKUP_DIR=".bootsplash_backup"

echo "Initializing bootsplash generation sandbox for brand '${BRAND}'..."
mkdir -p "${BACKUP_DIR}"

# Sandbox backup: Preserve main res and manifest
if [ -d "${MAIN_RES_DIR}" ]; then
    cp -R "${MAIN_RES_DIR}" "${BACKUP_DIR}/res"
fi
if [ -f "${MANIFEST}" ]; then
    cp "${MANIFEST}" "${BACKUP_DIR}/AndroidManifest.xml"
fi

IOS_PROJ_NAME=$(node -p "require('./app.json').name" 2>/dev/null || echo "baseApp")
IOS_PROJ_DIR="ios/${IOS_PROJ_NAME}"
PBXPROJ="ios/${IOS_PROJ_NAME}.xcodeproj/project.pbxproj"

if [ -f "${PBXPROJ}" ]; then
    cp "${PBXPROJ}" "${BACKUP_DIR}/project.pbxproj"
fi

if [ -f "${IOS_PROJ_DIR}/Info.plist" ]; then
    cp "${IOS_PROJ_DIR}/Info.plist" "${BACKUP_DIR}/Info.plist"
fi

# Run bootsplash CLI using direct npx binary to avoid RN CLI missing node_modules warnings
echo "Running react-native-bootsplash generation..."
npx react-native-bootsplash generate "${ABS_LOGO_PATH}" --background "${BG_COLOR}" --logo-width 100 || true

# Rename Android bootsplash_logo.png to logo.png
for DIR in "${MAIN_RES_DIR}"/drawable-*; do
    if [ -f "${DIR}/bootsplash_logo.png" ]; then
        mv "${DIR}/bootsplash_logo.png" "${DIR}/logo.png"
    fi
done

# Update XML references to point to the newly renamed logo
if [ -f "${MAIN_RES_DIR}/values/styles.xml" ]; then
    perl -pi -e 's/bootsplash_logo/logo/g' "${MAIN_RES_DIR}/values/styles.xml"
fi

# Rename BootSplash assets to LaunchScreen naming for iOS
IOS_PROJ_NAME=$(node -p "require('./app.json').name" 2>/dev/null || echo "baseApp")
IOS_PROJ_DIR="ios/${IOS_PROJ_NAME}"

if [ -d "${IOS_PROJ_DIR}" ]; then
    echo "Refining Bootsplash naming to match standards..."

    # 1. Rename Storyboard
    if [ -f "${IOS_PROJ_DIR}/BootSplash.storyboard" ]; then
        rm -f "${IOS_PROJ_DIR}/LaunchScreen.storyboard"
        mv "${IOS_PROJ_DIR}/BootSplash.storyboard" "${IOS_PROJ_DIR}/LaunchScreen.storyboard"
    fi

    # 2. Rename Colorset
    COLORSET=$(ls -d "${IOS_PROJ_DIR}/Colors.xcassets"/BootSplashBackground-*.colorset 2>/dev/null | head -n 1 || true)
    if [ -n "${COLORSET}" ]; then
        rm -rf "${IOS_PROJ_DIR}/Colors.xcassets/LaunchScreenBackground.colorset"
        mv "${COLORSET}" "${IOS_PROJ_DIR}/Colors.xcassets/LaunchScreenBackground.colorset"
    fi

    # 3. Rename Imageset & Files
    IMAGESET=$(ls -d "${IOS_PROJ_DIR}/Images.xcassets"/BootSplashLogo-*.imageset 2>/dev/null | head -n 1 || true)
    if [ -n "${IMAGESET}" ]; then
        NEW_IMAGESET="${IOS_PROJ_DIR}/Images.xcassets/LaunchImage.imageset"
        rm -rf "${NEW_IMAGESET}"
        mv "${IMAGESET}" "${NEW_IMAGESET}"

        # Rename internal images and patch Contents.json
        for IMG in "${NEW_IMAGESET}"/logo-*.png; do
            if [ -f "${IMG}" ]; then
                BASENAME=$(basename "${IMG}")
                NEW_NAME=$(echo "${BASENAME}" | sed 's/logo-[^@\.]*/launch_image_base/')
                mv "${IMG}" "${NEW_IMAGESET}/${NEW_NAME}"
            fi
        done
        if [ -f "${NEW_IMAGESET}/Contents.json" ]; then
            perl -pi -e 's/logo-[^"\.]*/launch_image_base/g' "${NEW_IMAGESET}/Contents.json"
        fi
    fi

    # 4. Patch LaunchScreen.storyboard references
    if [ -f "${IOS_PROJ_DIR}/LaunchScreen.storyboard" ]; then
        perl -pi -e 's/BootSplashLogo-[^"]*/LaunchImage/g' "${IOS_PROJ_DIR}/LaunchScreen.storyboard"
        perl -pi -e 's/BootSplashBackground-[^"]*/LaunchScreenBackground/g' "${IOS_PROJ_DIR}/LaunchScreen.storyboard"
    fi

    # 5. Restore original Info.plist & project.pbxproj to avoid duplicate references
    if [ -f "${BACKUP_DIR}/Info.plist" ]; then
        cp "${BACKUP_DIR}/Info.plist" "${IOS_PROJ_DIR}/Info.plist"
    fi

    if [ -f "${BACKUP_DIR}/project.pbxproj" ]; then
        cp "${BACKUP_DIR}/project.pbxproj" "${PBXPROJ}"
    fi
fi

# Distribute generated files to requested flavors
for FLAVOR in "${TARGET_FLAVORS[@]}"; do
    FLAVOR_RES_DIR="android/app/src/${FLAVOR}/res"
    echo "Distributing bootsplash assets to ${FLAVOR} flavor..."

    mkdir -p "${FLAVOR_RES_DIR}/values"

    # Safely copy generated drawable and mipmap folders
    for DIR in "${MAIN_RES_DIR}"/drawable-* "${MAIN_RES_DIR}"/mipmap-*; do
        if [ -d "${DIR}" ]; then
            cp -R "${DIR}" "${FLAVOR_RES_DIR}/"
        fi
    done

    # Copy mutated colors and styles if they exist
    if [ -f "${MAIN_RES_DIR}/values/colors.xml" ]; then
        cp "${MAIN_RES_DIR}/values/colors.xml" "${FLAVOR_RES_DIR}/values/"
    fi
    if [ -f "${MAIN_RES_DIR}/values/styles.xml" ]; then
        cp "${MAIN_RES_DIR}/values/styles.xml" "${FLAVOR_RES_DIR}/values/"
    fi
done

# Restore sandbox: Rollback main folder to original brand-agnostic state
echo "Restoring sandbox environment..."
rm -rf "${MAIN_RES_DIR}"
if [ -d "${BACKUP_DIR}/res" ]; then
    cp -R "${BACKUP_DIR}/res" "android/app/src/main/"
fi

if [ -f "${BACKUP_DIR}/AndroidManifest.xml" ]; then
    cp "${BACKUP_DIR}/AndroidManifest.xml" "android/app/src/main/"
fi

rm -rf "${BACKUP_DIR}"

# Remove unwanted bootsplash generator artifact bloat
rm -rf "assets/bootsplash"
rmdir "assets" 2>/dev/null || true

echo "Bootsplash sandbox cleared. Generation complete."

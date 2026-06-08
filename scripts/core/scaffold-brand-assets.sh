#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <TARGET_DIR> <PROJECT_NAME> <BRAND_NAME>"
    exit 1
fi

TARGET_DIR="$1"
PROJECT_NAME="$2"
BRAND_NAME="$3"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="${SCRIPT_DIR}/../../templates"
BRAND_CONFIG_DIR="${TARGET_DIR}/src/config/brands/${BRAND_NAME}"

echo "Scaffolding brand assets into ${BRAND_CONFIG_DIR}..."
mkdir -p "$BRAND_CONFIG_DIR"
cp -R -n "${TEMPLATES_DIR}/base/." "${BRAND_CONFIG_DIR}/" 2>/dev/null || true

# Initialize per-brand version configuration
BRAND_VERSION_JSON="${BRAND_CONFIG_DIR}/config.json"
if [ ! -f "${BRAND_VERSION_JSON}" ]; then
    if [[ -n "${BRAND_CONFIG_JSON:-}" ]]; then
        echo "$BRAND_CONFIG_JSON" >"${BRAND_VERSION_JSON}"
    else
        cat <<EOF >"${BRAND_VERSION_JSON}"
{
  "${BRAND_NAME}": {
    "android": {
      "versionName": "1.0.0",
      "versionCode": 1
    },
    "ios": {
      "versionNumber": "1.0.0",
      "buildNumber": 1
    }
  }
}
EOF
    fi
    echo "Created brand version configuration at ${BRAND_VERSION_JSON}"
fi

# Mutate template placeholders
echo "Mutating template placeholders..."
export PROJECT="${PROJECT_NAME}"
export BRAND="${BRAND_NAME}"
find "${BRAND_CONFIG_DIR}" -type f -exec perl -pi -e 's/baseApp/$ENV{PROJECT}/g' {} +
find "${BRAND_CONFIG_DIR}" -type f -exec perl -pi -e 's/baseapp/$ENV{BRAND}/g' {} +

# Rename and mutate Xcode schemes
XCSCHEMES_DIR="${BRAND_CONFIG_DIR}/xcschemes"
if [ -d "${XCSCHEMES_DIR}" ] && [ -n "$(ls -A "${XCSCHEMES_DIR}" 2>/dev/null)" ]; then
    echo "Refining Xcode schemes for brand '${BRAND_NAME}'..."

    DEV_SCHEME="${XCSCHEMES_DIR}/defaultDev.xcscheme"
    PROD_SCHEME="${XCSCHEMES_DIR}/defaultProd.xcscheme"

    NEW_DEV_SCHEME="${XCSCHEMES_DIR}/${BRAND_NAME}Dev.xcscheme"
    NEW_PROD_SCHEME="${XCSCHEMES_DIR}/${BRAND_NAME}Prod.xcscheme"

    if [ -f "${DEV_SCHEME}" ]; then
        mv "${DEV_SCHEME}" "${NEW_DEV_SCHEME}"
        perl -pi -e 's/defaultDev/$ENV{BRAND}Dev/g' "${NEW_DEV_SCHEME}"
        perl -pi -e 's/\.env\.default\./.env.$ENV{BRAND}./g' "${NEW_DEV_SCHEME}"
    fi

    if [ -f "${PROD_SCHEME}" ]; then
        mv "${PROD_SCHEME}" "${NEW_PROD_SCHEME}"
        perl -pi -e 's/defaultProd/$ENV{BRAND}Prod/g' "${NEW_PROD_SCHEME}"
        perl -pi -e 's/\.env\.default\./.env.$ENV{BRAND}./g' "${NEW_PROD_SCHEME}"
    fi

    # Asset Distribution (iOS Schemes ONLY - so Xcode recognizes the target dynamically)
    IOS_SCHEMES_DEST="${TARGET_DIR}/ios/${PROJECT_NAME}.xcodeproj/xcshareddata/xcschemes"
    mkdir -p "${IOS_SCHEMES_DEST}"
    cp "${XCSCHEMES_DIR}/"*.xcscheme "${IOS_SCHEMES_DEST}/" 2>/dev/null || true
    echo "Distributed Xcode schemes to ${IOS_SCHEMES_DEST}"
else
    echo "Warning: Xcode schemes directory is empty or missing at ${XCSCHEMES_DIR}"
fi

# Asset Distribution (iOS Full Structure)
echo "Distributing iOS native assets..."
IOS_PROJECT_DIR="${TARGET_DIR}/ios/${PROJECT_NAME}"
if [ -d "${BRAND_CONFIG_DIR}/firebase" ]; then
    mkdir -p "${IOS_PROJECT_DIR}/firebase"
    cp -R "${BRAND_CONFIG_DIR}/firebase/." "${IOS_PROJECT_DIR}/firebase/"
fi

if [ -d "${BRAND_CONFIG_DIR}/images/icons" ]; then
    APPICONSET_DIR="${IOS_PROJECT_DIR}/Images.xcassets/AppIcon.appiconset"
    mkdir -p "${APPICONSET_DIR}"
    cp -R "${BRAND_CONFIG_DIR}/images/icons/"*.png "${APPICONSET_DIR}/" 2>/dev/null || true

    echo "Generating AppIcon Contents.json..."
    echo '{ "images": [' >"${APPICONSET_DIR}/Contents.json"
    FIRST=true
    for ICON in "${APPICONSET_DIR}"/*.png; do
        if [ -f "$ICON" ]; then
            FILENAME=$(basename "$ICON")
            SIZE=$(echo "$FILENAME" | grep -oE '[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?' || echo "1024x1024")
            SCALE=$(echo "$FILENAME" | grep -oE '@[0-9]x' | tr -d '@' || echo "1x")
            IDIOM="iphone"
            if [[ "$FILENAME" == *"marketing"* ]]; then
                IDIOM="ios-marketing"
            fi
            if [ "$FIRST" = true ]; then FIRST=false; else echo ',' >>"${APPICONSET_DIR}/Contents.json"; fi
            echo '    { "filename": "'$FILENAME'", "idiom": "'$IDIOM'", "scale": "'$SCALE'", "size": "'$SIZE'" }' >>"${APPICONSET_DIR}/Contents.json"
        fi
    done
    echo '  ], "info": { "author": "capo-cli", "version": 1 } }' >>"${APPICONSET_DIR}/Contents.json"
fi

# Asset Distribution (Android)
echo "Distributing Android assets for brand '${BRAND_NAME}'..."
if [ -f "${BRAND_CONFIG_DIR}/firebase/DEV/google-services.json" ]; then
    cp "${BRAND_CONFIG_DIR}/firebase/DEV/google-services.json" "${TARGET_DIR}/android/app/src/dev/"
fi
if [ -f "${BRAND_CONFIG_DIR}/firebase/STAGING/google-services.json" ]; then
    cp "${BRAND_CONFIG_DIR}/firebase/STAGING/google-services.json" "${TARGET_DIR}/android/app/src/staging/"
fi
if [ -f "${BRAND_CONFIG_DIR}/firebase/PRD/google-services.json" ]; then
    cp "${BRAND_CONFIG_DIR}/firebase/PRD/google-services.json" "${TARGET_DIR}/android/app/src/prd/"
fi

echo "Scaffold assets complete for brand '${BRAND_NAME}'."

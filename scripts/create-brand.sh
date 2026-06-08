#!/usr/bin/env bash
set -euo pipefail

BRAND_NAME="${1:-}"

if [[ -z "$BRAND_NAME" ]]; then
    echo "Usage: $0 <BrandName>"
    exit 1
fi

TARGET_DIR=$(pwd)
BRANDS_JSON="${TARGET_DIR}/brands.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="${SCRIPT_DIR}/../templates"
BRAND_CONFIG_DIR="${TARGET_DIR}/src/config/brands/${BRAND_NAME}"

# 1. Validation
if [[ ! -f "$BRANDS_JSON" ]]; then
    echo "Fatal: brands.json not found in $(pwd). Are you inside an initialized project?"
    exit 1
fi

if [[ -d "$BRAND_CONFIG_DIR" ]]; then
    echo "Fatal: Brand directory $BRAND_CONFIG_DIR already exists."
    exit 1
fi

# Dynamically extract PROJECT_NAME from app.json
APP_JSON="${TARGET_DIR}/app.json"
if [[ ! -f "$APP_JSON" ]]; then
    echo "Fatal: app.json not found. Cannot determine PROJECT_NAME."
    exit 1
fi
PROJECT_NAME=$(node -e "console.log(require('${APP_JSON}').name)")

echo "======================================"
echo "🚀 Creating Brand: ${BRAND_NAME} (Project: ${PROJECT_NAME})"
echo "======================================"

# 2. Copy Base Templates (Deep Clone)
echo "Scaffolding brand assets into ${BRAND_CONFIG_DIR}..."
mkdir -p "$BRAND_CONFIG_DIR"
cp -R -n "${TEMPLATES_DIR}/base/." "${BRAND_CONFIG_DIR}/" 2>/dev/null || true

# Initialize per-brand version configuration
BRAND_VERSION_JSON="${BRAND_CONFIG_DIR}/config.json"
if [ ! -f "${BRAND_VERSION_JSON}" ]; then
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

# 3. Update Brands.json via Node subshell
echo "Registering ${BRAND_NAME} in brands.json..."
node -e "
const fs = require('fs');
const file = '${BRANDS_JSON}';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!data.brands.includes('${BRAND_NAME}')) {
    data.brands.push('${BRAND_NAME}');
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
"

# 4. Generate Splash
LOGO_PATH="${BRAND_CONFIG_DIR}/images/logo/logo.png"
if [ -f "${LOGO_PATH}" ]; then
    echo "Triggering Bootsplash generation for ${BRAND_NAME}..."
    bash "${SCRIPT_DIR}/generate-splash.sh" "$TARGET_DIR" "$BRAND_NAME" "$LOGO_PATH" "#FFFFFF" "dev" "staging" "prd"
else
    echo "Warning: Logo not found at ${LOGO_PATH}. Skipping bootsplash generation."
fi

echo "======================================"
echo "✅ Brand '${BRAND_NAME}' successfully staged!"
echo "Run 'capo --action=run' or 'capo --action=pack' to actively distribute and build this brand."
echo "======================================"

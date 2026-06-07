#!/usr/bin/env bash
set -euo pipefail

BRAND_NAME="${1:-}"

if [[ -z "$BRAND_NAME" ]]; then
    echo "Usage: $0 <BrandName>"
    exit 1
fi

TARGET_DIR=$(pwd)
BRANDS_JSON="${TARGET_DIR}/brands.json"
TEMPLATES_DIR="$(dirname "$0")/../templates"
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

echo "======================================"
echo "🚀 Creating Brand: ${BRAND_NAME}"
echo "======================================"

# 2. Copy Base Templates
echo "Scaffolding brand assets into ${BRAND_CONFIG_DIR}..."
mkdir -p "$BRAND_CONFIG_DIR"
cp -R "${TEMPLATES_DIR}/base/firebase" "${BRAND_CONFIG_DIR}/"
cp -R "${TEMPLATES_DIR}/base/images" "${BRAND_CONFIG_DIR}/"
cp -R "${TEMPLATES_DIR}/base/colors" "${BRAND_CONFIG_DIR}/"

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
echo "Triggering Bootsplash generation for ${BRAND_NAME}..."
bash "$(dirname "$0")/generate-splash.sh" "$TARGET_DIR" "$BRAND_NAME" "$LOGO_PATH" "#FFFFFF" "dev" "staging" "prd"

echo "======================================"
echo "✅ Brand '${BRAND_NAME}' successfully created!"
echo "======================================"

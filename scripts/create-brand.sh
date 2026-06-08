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

if [[ ! -f "$BRANDS_JSON" ]]; then
    echo "Fatal: brands.json not found in $(pwd)."
    exit 1
fi

APP_JSON="${TARGET_DIR}/app.json"
if [[ ! -f "$APP_JSON" ]]; then
    echo "Fatal: app.json not found."
    exit 1
fi

PROJECT_NAME=$(node -e "console.log(require('${APP_JSON}').name)")
OLD_BRAND=$(node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('${BRANDS_JSON}', 'utf8')); console.log(data.activeBrand || data.brands[0] || '${PROJECT_NAME}');")

echo "======================================"
echo "🚀 Creating Brand: ${BRAND_NAME} (Project: ${PROJECT_NAME})"
echo "======================================"

bash "${SCRIPT_DIR}/core/scaffold-brand-assets.sh" "${TARGET_DIR}" "${PROJECT_NAME}" "${BRAND_NAME}"
bash "${SCRIPT_DIR}/core/apply-active-brand.sh" "${TARGET_DIR}" "${BRAND_NAME}" "${OLD_BRAND}"

echo "======================================"
echo "✅ Brand '${BRAND_NAME}' successfully created and applied as the active brand!"
echo "======================================"

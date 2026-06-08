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

# Extract OLD_BRAND before mutating brands.json
OLD_BRAND=$(node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('${BRANDS_JSON}', 'utf8'));
console.log(data.activeBrand || data.brands[0] || '${PROJECT_NAME}');
")

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

# 3. Asset Distribution (iOS Full Structure)
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

# 4. Generate Splash
LOGO_PATH="${BRAND_CONFIG_DIR}/images/logo/logo.png"
if [ -f "${LOGO_PATH}" ]; then
    echo "Triggering Bootsplash generation for ${BRAND_NAME}..."
    bash "${SCRIPT_DIR}/generate-splash.sh" "$TARGET_DIR" "$BRAND_NAME" "$LOGO_PATH" "#FFFFFF" "dev" "staging" "prd"
else
    echo "Warning: Logo not found at ${LOGO_PATH}. Skipping bootsplash generation."
fi

# 5. Overwrite App.tsx
APP_TSX="${TARGET_DIR}/App.tsx"
if [ -f "${APP_TSX}" ]; then
    echo "Overwriting default App.tsx with custom branded screen for '${BRAND_NAME}'..."
    cat <<EOF >"${APP_TSX}"
import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';

const App = () => {
  useEffect(() => {
    const init = async () => {
      // …do multiple sync or async tasks
    };

    init().finally(async () => {
      await BootSplash.hide({ fade: true });
      console.log("BootSplash has been hidden successfully");
    });
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <Image 
            source={require('./src/config/brands/${BRAND_NAME}/images/logo/logo.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <Text style={styles.brandName}>${BRAND_NAME}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.welcomeText}>Welcome to the whitelabel application!</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  logo: { width: 45, height: 45, marginRight: 15 },
  brandName: { fontSize: 24, fontWeight: 'bold', color: '#212529' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  welcomeText: { fontSize: 18, color: '#6C757D', textAlign: 'center' }
});

export default App;
EOF
fi

# 6. Universal Deep Rename to New Brand
echo "Aligning native project identifiers from '${OLD_BRAND}' to new brand '${BRAND_NAME}'..."
bash "${SCRIPT_DIR}/deep-rename.sh" "${TARGET_DIR}" "${OLD_BRAND}" "${BRAND_NAME}"

# 7. Update Brands.json to set activeBrand
echo "Registering ${BRAND_NAME} as active in brands.json..."
node -e "
const fs = require('fs');
const file = '${BRANDS_JSON}';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!data.brands.includes('${BRAND_NAME}')) {
    data.brands.push('${BRAND_NAME}');
}
data.activeBrand = '${BRAND_NAME}';
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
"

echo "======================================"
echo "✅ Brand '${BRAND_NAME}' successfully created and applied as the active brand!"
echo "======================================"

#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <TARGET_DIR> <BRAND_NAME> <OLD_BRAND>"
    exit 1
fi

TARGET_DIR="$1"
BRAND_NAME="$2"
OLD_BRAND="$3"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRAND_CONFIG_DIR="${TARGET_DIR}/src/config/brands/${BRAND_NAME}"
BRANDS_JSON="${TARGET_DIR}/brands.json"

# 1. Extract Primary Color from Config
PRIMARY_COLOR=$(node -e "
const fs = require('fs');
try {
  const config = JSON.parse(fs.readFileSync('${BRAND_CONFIG_DIR}/config.json', 'utf8'));
  console.log(config['${BRAND_NAME}'].primaryColor || '#FFFFFF');
} catch(e) {
  console.log('#FFFFFF');
}
")

# 2. Generate Splash
LOGO_PATH="${BRAND_CONFIG_DIR}/images/logo/logo.png"
if [ -f "${LOGO_PATH}" ]; then
    echo "Triggering Bootsplash generation for ${BRAND_NAME} with primary color ${PRIMARY_COLOR}..."
    bash "${SCRIPT_DIR}/../generate-splash.sh" "$TARGET_DIR" "$BRAND_NAME" "$LOGO_PATH" "${PRIMARY_COLOR}" "dev" "staging" "prd"
else
    echo "Warning: Logo not found at ${LOGO_PATH}. Skipping bootsplash generation."
fi

# 2. Overwrite App.tsx
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
        <StatusBar barStyle="light-content" backgroundColor="${PRIMARY_COLOR}" />
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
    backgroundColor: '${PRIMARY_COLOR}',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  logo: { width: 45, height: 45, marginRight: 15 },
  brandName: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  welcomeText: { fontSize: 18, color: '#6C757D', textAlign: 'center' }
});

export default App;
EOF
fi

# 3. Universal Deep Rename to New Brand
echo "Aligning native project identifiers from '${OLD_BRAND}' to new brand '${BRAND_NAME}'..."
bash "${SCRIPT_DIR}/../deep-rename.sh" "${TARGET_DIR}" "${OLD_BRAND}" "${BRAND_NAME}"

# 4. Update Brands.json to set activeBrand
echo "Registering ${BRAND_NAME} as active in brands.json..."
node -e "
const fs = require('fs');
const file = '${BRANDS_JSON}';
let data = { activeBrand: '', brands: [] };
if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
}
if (!data.brands) data.brands = [];
if (!data.brands.includes('${BRAND_NAME}')) {
    data.brands.push('${BRAND_NAME}');
}
data.activeBrand = '${BRAND_NAME}';
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
"

echo "Brand application phase complete."

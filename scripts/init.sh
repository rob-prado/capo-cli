#!/usr/bin/env bash
set -euo pipefail

# Fail fast if required arguments are missing
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <PROJECT_NAME> <INITIAL_BRAND>"
    exit 1
fi

PROJECT_NAME="$1"
INITIAL_BRAND="$2"
TARGET_DIR="./${PROJECT_NAME}"

# Resolve the absolute path of the script directory to fix global execution routing
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting initialization for project: ${PROJECT_NAME} with brand: ${INITIAL_BRAND}"

# 1. Bootstrapping React Native app (Idempotent)
if [ ! -d "${TARGET_DIR}" ]; then
    echo "Bootstrapping React Native app..."
    # We use npx react-native init with non-interactive flags as instructed
    # Skipping Git Init so the initial commit can occur after deep rename
    npx @react-native-community/cli init "${PROJECT_NAME}" --skip-install --skip-git-init --pm npm --directory "${TARGET_DIR}"
    echo "Created project directory via react-native init: ${TARGET_DIR}"
else
    echo "Project directory ${TARGET_DIR} already exists. Skipping React Native init to proceed idempotently."
fi

# Patch package.json inside the new project to silence RN CLI bootsplash warnings
if [ -f "${TARGET_DIR}/package.json" ]; then
    echo "Patching package.json in ${TARGET_DIR}..."
    perl -pi -e 's/"devDependencies": \{/"devDependencies": {\n    "\@react-native-community\/cli": "latest",/' "${TARGET_DIR}/package.json"

    echo "Installing missing dependencies..."
    npm install react-native-config react-native-bootsplash --prefix "${TARGET_DIR}"
    npm uninstall @react-native/new-app-screen --prefix "${TARGET_DIR}"
    npm install -D @react-native-community/cli --prefix "${TARGET_DIR}"

    # Fix React Native 0.85 compatibility issue with Java 26 & Gradle 9.3.1
    echo "Patching Foojay plugin version for Gradle 9+ compatibility..."
    perl -pi -e 's/"0\.5\.0"/"1.0.0"/g' "${TARGET_DIR}/node_modules/\@react-native/gradle-plugin/settings.gradle.kts" 2>/dev/null || true

    # Update package.json scripts to enforce environment flavors natively
    echo "Updating execution scripts for flavor compatibility..."
    node -e "
const fs = require('fs');
const pkgPath = '${TARGET_DIR}/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath));
pkg.scripts['android'] = 'react-native run-android --mode=devDebug';
pkg.scripts['android:dev'] = 'react-native run-android --mode=devDebug';
pkg.scripts['android:staging'] = 'react-native run-android --mode=stagingDebug';
pkg.scripts['android:prd'] = 'react-native run-android --mode=prdDebug';
pkg.scripts['ios'] = 'react-native run-ios --scheme=${PROJECT_NAME}Dev';
pkg.scripts['ios:dev'] = 'react-native run-ios --scheme=${PROJECT_NAME}Dev';
pkg.scripts['ios:staging'] = 'react-native run-ios --scheme=${PROJECT_NAME}Staging';
pkg.scripts['ios:prd'] = 'react-native run-ios --scheme=${PROJECT_NAME}Prd';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
"
fi

# 1.1 Mutate app.json displayName
# We apply this idempotently after RN initialization so the user sees the brand name
APP_JSON="${TARGET_DIR}/app.json"
if [ -f "${APP_JSON}" ]; then
    echo "Ensuring app.json displayName matches brand '${INITIAL_BRAND}'..."
    export BRAND="${INITIAL_BRAND}"
    perl -pi -e 's/"displayName":\s*".*?"/"displayName": "$ENV{BRAND}"/' "${APP_JSON}"
    JAVA_VERSION=$(cat "${SCRIPT_DIR}/../.capo-java-version" | tr -d '[:space:]')
    # Fix Gradle jlink bugs on newer Java versions by explicitly locking the daemon
    echo "Attempting to lock Gradle daemon to Java ${JAVA_VERSION}..."
    JAVA_PATH=""
    if command -v mise >/dev/null 2>&1; then
        JAVA_PATH=$(mise where "java@${JAVA_VERSION}" 2>/dev/null || echo "")
    fi
    if [ -z "$JAVA_PATH" ] && command -v /usr/libexec/java_home >/dev/null 2>&1; then
        JAVA_PATH=$(/usr/libexec/java_home -v "${JAVA_VERSION}" 2>/dev/null || echo "")
    fi
    if [ -n "$JAVA_PATH" ]; then
        echo "org.gradle.java.home=$JAVA_PATH" >>"${TARGET_DIR}/android/gradle.properties"
        echo "Locked Gradle daemon to Java ${JAVA_VERSION} at $JAVA_PATH"
    else
        echo "Warning: Could not automatically locate Java ${JAVA_VERSION}. You may encounter jlink build errors on newer Java versions."
    fi
fi

# 1.2 Mutate Android build.gradle
GRADLE_FILE="${TARGET_DIR}/android/app/build.gradle"
if [ -f "${GRADLE_FILE}" ]; then
    echo "Injecting dynamic Android flavor configuration into build.gradle..."
    export BRAND="${INITIAL_BRAND}"

    # Inject envConfigFiles right after the react plugin is applied
    perl -0777 -pi -e 's/(apply plugin: "com\.facebook\.react".*?\n)/$1\nproject.ext.envConfigFiles = [\n    dev: ".env.$ENV{BRAND}.dev",\n    staging: ".env.$ENV{BRAND}.staging",\n    prd: ".env.$ENV{BRAND}.prd"\n]\napply from: project(":react-native-config").projectDir.getPath() + "\/dotenv.gradle"\n/s' "${GRADLE_FILE}"

    # Inject flavorDimensions just above the defaultConfig block
    perl -0777 -pi -e 's/(\s*)(defaultConfig\s*\{)/$1flavorDimensions "default"$1$2/s' "${GRADLE_FILE}"

    # Safely inject the productFlavors block right after the closing brace of defaultConfig
    # Assumes no nested braces inside defaultConfig, which is standard for fresh RN init
    perl -0777 -pi -e 's/(defaultConfig\s*\{[^}]*\})/$1\n\n    productFlavors {\n        dev {\n            dimension "default"\n            applicationIdSuffix ".dev"\n        }\n        staging {\n            dimension "default"\n            applicationIdSuffix ".staging"\n        }\n        prd {\n            dimension "default"\n        }\n    }/s' "${GRADLE_FILE}"
fi

# 1.3 Mutate AndroidManifest.xml
MANIFEST_FILE="${TARGET_DIR}/android/app/src/main/AndroidManifest.xml"
if [ -f "${MANIFEST_FILE}" ]; then
    echo "Scaffolding AndroidManifest.xml for Bootsplash, Deep Linking and advanced Whitelabeling..."

    # Inject xmlns:tools to <manifest>
    perl -0777 -pi -e 's/(<manifest[^>]*?)(>)/$1 xmlns:tools="http:\/\/schemas.android.com\/tools"$2/s' "${MANIFEST_FILE}"

    # Inject permissions
    perl -0777 -pi -e 's/(<uses-permission android:name="android\.permission\.INTERNET" \/>)/$1\n    <uses-permission android:name="android.permission.CAMERA" \/>\n    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" \/>\n    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" \/>\n    <uses-permission android:name="android.permission.VIBRATE" \/>/' "${MANIFEST_FILE}"

    # Inject forceDarkAllowed="false" into <application>
    perl -0777 -pi -e 's/(<application[^>]*?)(>)/$1\n      android:forceDarkAllowed="false"$2/s' "${MANIFEST_FILE}"

    # Inject Google Analytics meta-data inside <application> right after the opening tag
    perl -0777 -pi -e 's/(<application[^>]*?>)/$1\n      <meta-data\n        android:name="google_analytics_adid_collection_enabled"\n        android:value="false"\n        tools:replace="android:value" \/>/' "${MANIFEST_FILE}"

    # Inject android:theme="@style/BootTheme" into MainActivity
    perl -0777 -pi -e 's/(<activity[^>]*?android:name="\.MainActivity"[^>]*?)(>)/$1\n        android:theme="\@style\/BootTheme"$2/s' "${MANIFEST_FILE}"

    # Inject intent-filters (use lowercased project name as scheme)
    LOWER_PROJECT_NAME=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]')
    perl -0777 -pi -e 's/(<intent-filter>\s*<action android:name="android\.intent\.action\.MAIN" \/>\s*<category android:name="android\.intent\.category\.LAUNCHER" \/>\s*<\/intent-filter>)/$1\n        <intent-filter>\n            <action android:name="android.intent.action.VIEW" \/>\n            <category android:name="android.intent.category.DEFAULT" \/>\n            <category android:name="android.intent.category.BROWSABLE" \/>\n            <data android:scheme="'"$LOWER_PROJECT_NAME"'" \/>\n            <data android:host="'"$LOWER_PROJECT_NAME"'" \/>\n        <\/intent-filter>/' "${MANIFEST_FILE}"
fi

# 1.4 Mutate MainActivity.kt for Bootsplash
MAIN_ACTIVITY=$(find "${TARGET_DIR}/android/app/src/main" -name "MainActivity.kt" 2>/dev/null | head -n 1)
if [ -n "${MAIN_ACTIVITY}" ]; then
    echo "Injecting Bootsplash initialization into MainActivity.kt..."
    perl -0777 -pi -e 's/(import com\.facebook\.react\.ReactActivity)/import android.os.Build\nimport android.os.Bundle\nimport androidx.core.view.WindowCompat\nimport com.zoontek.rnbootsplash.RNBootSplash\n$1/' "${MAIN_ACTIVITY}"
    perl -0777 -pi -e 's/(class MainActivity : ReactActivity\(\) \{)/$1\n\n  override fun onCreate(savedInstanceState: Bundle?) {\n    RNBootSplash.init(this, R.style.BootTheme)\n    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {\n        window.decorView.isForceDarkAllowed = false\n    }\n    super.onCreate(null)\n    WindowCompat.setDecorFitsSystemWindows(window, false)\n  }\n/' "${MAIN_ACTIVITY}"
fi

# 2. Scaffold foundational directory structure inside the new project
# Deep scaffolding ensures RN whitelabel resources are properly segmented by environment
mkdir -p "${TARGET_DIR}/android/app/src/dev/res"
mkdir -p "${TARGET_DIR}/android/app/src/staging/res"
mkdir -p "${TARGET_DIR}/android/app/src/prd/res"
# Ensure the base brand directory exists so we can clone into it
mkdir -p "${TARGET_DIR}/src/config/brands/${INITIAL_BRAND}"
echo "Directory structure established."

# Create brand-specific environment files
touch "${TARGET_DIR}/.env.${INITIAL_BRAND}.dev"
touch "${TARGET_DIR}/.env.${INITIAL_BRAND}.staging"
touch "${TARGET_DIR}/.env.${INITIAL_BRAND}.prd"
echo "Created empty environment files for brand '${INITIAL_BRAND}'"

# 3. Yarn Workspace setup
YARN_RC="${TARGET_DIR}/.yarnrc.yml"
if [ ! -f "${YARN_RC}" ]; then
    echo "nodeLinker: node-modules" >"${YARN_RC}"
    echo "Created .yarnrc.yml"
fi

# 3.1 Java Version Specifiers for Environment Managers
echo "Generating Java version specifiers for popular managers..."
cp "${SCRIPT_DIR}/../.capo-java-version" "${TARGET_DIR}/android/.java-version"
cp "${SCRIPT_DIR}/../.capo-tool-versions" "${TARGET_DIR}/android/.tool-versions"
cp "${SCRIPT_DIR}/../.capo-sdkmanrc" "${TARGET_DIR}/android/.sdkmanrc"

# 3.2 Auto-install/activate Java in the generated project
echo "Activating Java environment for Android..."
(
    cd "${TARGET_DIR}/android" || exit
    if command -v mise >/dev/null 2>&1; then
        echo "Using mise to install/activate Java..."
        mise install java || true
    elif command -v asdf >/dev/null 2>&1; then
        echo "Using asdf to install/activate Java..."
        asdf plugin add java 2>/dev/null || true
        asdf install java || true
    elif command -v jenv >/dev/null 2>&1; then
        echo "Notice: jenv detected. Please ensure Java is added to jenv manually if not already present."
    elif [ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]; then
        echo "Using sdkman to install/activate Java..."
        # Source sdkman script strictly for this subshell
        source "$HOME/.sdkman/bin/sdkman-init.sh"
        sdk env install || true
    else
        echo "Notice: No supported Java environment manager (mise, asdf, sdkman, jenv) found. Please ensure Java is installed manually."
    fi
)

# 4. Template Cloning & Placeholder Mutation
# Now reliably resolving relative to the CLI's installation folder
TEMPLATE_DIR="${SCRIPT_DIR}/../templates/base"
if [ -d "${TEMPLATE_DIR}" ]; then
    # Copy template contents idempotently.
    bash "${SCRIPT_DIR}/core/scaffold-brand-assets.sh" "${TARGET_DIR}" "${PROJECT_NAME}" "${INITIAL_BRAND}"

    echo "Scaffolding Android flavor resources..."
    if [ -d "${TARGET_DIR}/android/app/src/main/res" ]; then
        # Clean up unwanted React Native default theme attributes in the main source
        STYLES_XML="${TARGET_DIR}/android/app/src/main/res/values/styles.xml"
        if [ -f "${STYLES_XML}" ]; then
            perl -0777 -pi -e 's/\s*<item name="android:editTextBackground">\@drawable\/rn_edit_text_material<\/item>\n?//g' "${STYLES_XML}"
        fi
        # Remove unwanted React Native default drawable from main
        rm -f "${TARGET_DIR}/android/app/src/main/res/drawable/rn_edit_text_material.xml"

        for SUFFIX in dev staging prd; do
            cp -R "${TARGET_DIR}/android/app/src/main/res/." "${TARGET_DIR}/android/app/src/${SUFFIX}/res/"

            STRINGS_XML="${TARGET_DIR}/android/app/src/${SUFFIX}/res/values/strings.xml"
            if [ -f "${STRINGS_XML}" ]; then
                if [ "${SUFFIX}" == "dev" ]; then
                    perl -pi -e "s/<string name=\"app_name\">.*<\/string>/<string name=\"app_name\">${PROJECT_NAME} DEV<\/string>/g" "${STRINGS_XML}"
                elif [ "${SUFFIX}" == "staging" ]; then
                    perl -pi -e "s/<string name=\"app_name\">.*<\/string>/<string name=\"app_name\">${PROJECT_NAME} STAGING<\/string>/g" "${STRINGS_XML}"
                else
                    perl -pi -e "s/<string name=\"app_name\">.*<\/string>/<string name=\"app_name\">${PROJECT_NAME}<\/string>/g" "${STRINGS_XML}"
                fi
            fi
        done
    fi

else
    echo "Notice: No base templates found at ${TEMPLATE_DIR}. Skipping clone."
fi

# 4.1 Fastlane Scaffolding
FASTLANE_TEMPLATE_DIR="${SCRIPT_DIR}/../templates/fastlane"
if [ -d "${FASTLANE_TEMPLATE_DIR}" ]; then
    echo "Setting up fastlane templates..."
    mkdir -p "${TARGET_DIR}/android/fastlane"
    mkdir -p "${TARGET_DIR}/ios/fastlane"
    cp -R "${FASTLANE_TEMPLATE_DIR}/android/." "${TARGET_DIR}/android/fastlane/" 2>/dev/null || true
    cp -R "${FASTLANE_TEMPLATE_DIR}/ios/." "${TARGET_DIR}/ios/fastlane/" 2>/dev/null || true

    BASE_APP_ID=$(grep -m 1 "applicationId " "${TARGET_DIR}/android/app/build.gradle" | awk '{print $2}' | tr -d '"'\''')
    if [ -n "$BASE_APP_ID" ]; then
        find "${TARGET_DIR}/android/fastlane" "${TARGET_DIR}/ios/fastlane" -type f -exec perl -pi -e "s/com\.baseapp\.app/$BASE_APP_ID/g" {} +
    fi
    find "${TARGET_DIR}/android/fastlane" "${TARGET_DIR}/ios/fastlane" -type f -exec perl -pi -e "s/baseApp/$PROJECT_NAME/g" {} +

    # Replace generic generic 'default' values with the actual INITIAL_BRAND
    find "${TARGET_DIR}/android/fastlane" "${TARGET_DIR}/ios/fastlane" -type f -exec perl -pi -e "s/'default'/'$INITIAL_BRAND'/g" {} +
    find "${TARGET_DIR}/android/fastlane" "${TARGET_DIR}/ios/fastlane" -type f -exec perl -pi -e "s/\"default\"/\"$INITIAL_BRAND\"/g" {} +
    find "${TARGET_DIR}/android/fastlane" "${TARGET_DIR}/ios/fastlane" -type f -exec perl -pi -e "s/-default-/-$INITIAL_BRAND-/g" {} +

    echo "Fastlane templates setup completed."
fi

# 5. Apply Initial Brand Configuration (Splash, App.tsx, Deep Rename, and Brands.json)
bash "${SCRIPT_DIR}/core/apply-active-brand.sh" "${TARGET_DIR}" "${INITIAL_BRAND}" "${PROJECT_NAME}"

# 9. Initialize Git Repository
echo "Initializing Git repository and creating first commit..."
cd "${TARGET_DIR}"
git init
git add .
git commit -m "chore: initial commit (Greenfield Initialization & Deep Rename)"
cd ..

echo "Scaffolding complete for ${PROJECT_NAME} (Brand: ${INITIAL_BRAND})."

# 6. Flush Watchman to prevent Metro bundler ghost caching
echo "Flushing Watchman cache..."
watchman watch-del-all >/dev/null 2>&1 || true
echo "Run 'npm start -- --reset-cache' if Metro hangs!"

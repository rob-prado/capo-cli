# Skill: Universal Deep Rename

## Business Value
The "Deep Rename" process is the cornerstone of Capo CLI's Brand Agnosticism invariant. It dynamically mutates the core React Native OS configurations (iOS and Android) to inject a target brand's identifiers. This allows a single, pure base codebase to be compiled into infinite whitelabel variations without hardcoding brand configurations directly into the main repository.

## Expected Inputs
The Bash executor (`scripts/deep-rename.sh`) accepts:
- `TARGET_DIR` (Mandatory): The absolute path to the initialized project.
- `OLD_BRAND` (Optional): The currently active brand name. If omitted, the script dynamically extracts it by parsing `app.json`.
- `NEW_BRAND` (Mandatory): The target brand name to apply.

## Mutated Android Artifacts
The script targets the `android/` directory and performs two operations:
1. **Regex String Replacement:** Safely applies `perl -pi -e` to recursively mutate package bindings and strings inside:
   - `build.gradle`
   - `strings.xml`
   - `settings.gradle`
   - `MainActivity.*` and `MainApplication.*`
   - `*.json` (Firebase/Google Services configs)
2. **Directory Structure Re-mapping:** Safely moves the deep Java package directory from `com/oldbrand` to `com/newbrand` using lowercase translations.

## Mutated iOS Artifacts
The script targets the `ios/` directory and handles complex Xcode namespace mutations:
1. **Regex String Replacement:** Safely replaces the old brand string inside:
   - `*.pbxproj` (The core Xcode project structure map)
   - `Info.plist`
   - `Podfile`
   - `*.xcscheme` (Xcode Schemes)
   - `AppDelegate.*`
   - `*.plist`
   - `*.json`
2. **Directory Structure Re-mapping:** Safely renames crucial project directories and workspaces:
   - `ios/<OldBrand>` -> `ios/<NewBrand>`
   - `ios/<OldBrand>.xcodeproj` -> `ios/<NewBrand>.xcodeproj`
   - `ios/<OldBrand>.xcworkspace` -> `ios/<NewBrand>.xcworkspace`
   - `ios/<NewBrand>.xcodeproj/xcshareddata/xcschemes/<OldBrand>.xcscheme` -> `ios/<NewBrand>.xcodeproj/xcshareddata/xcschemes/<NewBrand>.xcscheme`

## Root Artifacts & Staging
- Mutates root identifiers in `app.json` and `package.json`.
- Triggers `yarn install` or `npm install` dynamically to resynchronize package manager lockfiles after the `package.json` mutation.
- Automatically executes a `git add .` at the root to formally stage the massive filesystem footprint changes safely.

## Edge Cases & Risks
- **Regex Limitations (`sed`):** This script STRICTLY forbids `sed -i` due to severe macOS vs. Linux cross-platform incompatibilities. `perl -pi -e` is used universally to guarantee cross-OS execution safety.
- **Idempotency Lock:** The script checks if `OLD_BRAND` exactly matches `NEW_BRAND`. If true, it exits gracefully without mutating to prevent infinite recursion.
- **Fail-Fast Safety:** The script temporarily lifts `set -e` during `app.json` dynamic extraction to prevent Node exceptions from fatally crashing the Bash execution environment.

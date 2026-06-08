# Skill: Brand Scaffolding & Asset Payload Generation

## Business Value
This skill initializes the architectural footprint for a newly registered brand. It is strictly responsible for cloning the agnostic `templates/` structure into a dedicated `src/config/brands/<BrandName>` folder without touching the active native codebase. It securely bridges Node.js configurations into bash.

## Expected Inputs
The script (`scripts/core/scaffold-brand-assets.sh`) expects:
- `TARGET_DIR`: The absolute path to the initialized project.
- `PROJECT_NAME`: The extracted core name from `app.json`.
- `BRAND_NAME`: The target brand being generated.
- **Environment Input**: `BRAND_CONFIG_JSON` (Optional, injected dynamically by the Node.js orchestrator layer).

## Execution Flow
1. **Directory Initialization**: Creates `src/config/brands/<BRAND_NAME>` and synchronously clones the `/templates/base/` repository skeleton.
2. **Configuration Handoff**: If the `$BRAND_CONFIG_JSON` environment variable is detected, it pipes the raw Node.js payload directly into `config.json`. If missing, it generates a default version map.
3. **Template Mutation**: Translates boilerplate placeholders (`baseApp`, `baseapp`) into the `BRAND_NAME` dynamically via `perl -pi -e`.
4. **Xcode Scheme Cloning**: Duplicates `defaultDev.xcscheme` and `defaultProd.xcscheme`, injects the brand identifiers inside the `.env` references, and permanently maps them into the active iOS `xcshareddata/xcschemes` folder so Xcode recognizes the new flavor targets.
5. **iOS AppIcon Generator (Dynamic Map)**:
   - Evaluates the brand's `images/icons/` folder containing standard PNGs.
   - Automatically generates the strict Apple `Contents.json` matrix required for `AppIcon.appiconset`, inferring scales (`@2x`, `@3x`) and sizes dynamically from the PNG filenames using regular expressions.
6. **Android Asset Distribution**: Directly routes any Google Services (`google-services.json`) configs from the brand's payload folder into their corresponding `dev/`, `staging/`, and `prd/` native Android structure.

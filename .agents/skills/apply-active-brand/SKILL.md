# Skill: The Brand Overrider

## Business Value
This skill acts as the master execution bus for the Whitelabel Engine. It acts as the final phase of the `create-brand` command (or potentially a future `switch-brand` command), taking a fully scaffolded brand configuration and universally applying it to the active project layer.

## Expected Inputs
The script (`scripts/core/apply-active-brand.sh`) expects:
- `TARGET_DIR`: The absolute path to the initialized project.
- `BRAND_NAME`: The target brand being applied.
- `OLD_BRAND`: The previous brand state to replace (used heavily by the Deep Rename downstream).

## Execution Pipeline
1. **Phase 1 - Sandbox Generation**: Detects if a custom brand logo exists. If so, triggers `generate-splash.sh` to scaffold and distribute Bootsplash assets natively across `dev`, `staging`, and `prd` target flavors without contaminating `main/`.
2. **Phase 2 - React Native UI Hijack**: Aggressively overwrites the default `App.tsx` file inside the root repository to inject a dynamic, hard-coded splash fallback UI targeting the new brand's logo mapping via a direct `require()` import path.
3. **Phase 3 - Universal Deep Rename Execution**: Delegates the heavy native OS refactoring to the `deep-rename.sh` module, passing down the `OLD_BRAND` and `BRAND_NAME` to synchronize Java packages, Xcode schemas, Info.plists, and Gradle configs safely.
4. **Phase 4 - State Locking**: Synchronously reads the `brands.json` tracking file, updates the `brands` array matrix if missing, formally locks the `activeBrand` key to the newly applied `BRAND_NAME`, and rewrites the payload to disk.

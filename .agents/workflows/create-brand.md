# Workflow: create-brand

## Objective
To safely scaffold, generate, and natively activate a new brand within an existing React Native Capo project without disrupting the pure base structure.

## Inputs/Flags
- `brandName`: The name of the new brand to be created.
- `bundleId`: The target bundle identifier (e.g., com.example.brand).
- `primaryColor`: The primary hex color for the new brand.

## Step-by-step Execution Flow
1. **Pre-flight Checks (Node.js)**
   - Validates that the command is executed inside an initialized project (checks for `brands.json`).
   - Validates `brandName` format (alphanumeric only).
   - If inputs are missing, prompts the user interactively using the **Wizard Utility** (which supports Back/Quit navigation).
   - Checks `brands.json` to ensure the brand does not already exist.

2. **Orchestration Delegation (Node.js -> Bash)**
   - Spawns the native Bash executor `scripts/create-brand.sh`.

3. **Asset Scaffolding & Activation (Bash)**
   - Discovers `PROJECT_NAME` dynamically.
   - Executes `scripts/core/scaffold-brand-assets.sh` to clone templates, mutate base placeholders, and stage assets.
   - Executes `scripts/core/apply-active-brand.sh` to generate bootsplash images, overwrite `App.tsx`, distribute native OS assets, perform a Universal Deep Rename, and set the new brand as active in `brands.json`.

## Expected Outputs & Verification
- A newly populated directory in `src/config/brands/<brandName>`.
- Native iOS and Android configuration layers heavily modified to reflect the new brand (via Deep Rename).
- `brands.json` updated with `"activeBrand": "<brandName>"`.
- The CLI outputs an Exit Code 0 with a success message.

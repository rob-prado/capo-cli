# System Invariants

These invariants define the absolute hard truths of the Capo CLI architecture. Breaking any of these rules will result in catastrophic system failures, corrupted React Native builds, or violated Agent workflows.

## 1. Dual Architecture Constraint
- The CLI **MUST** remain split between Node.js and Bash.
- **Node.js** exclusively handles UX (Inquirer), prompt routing, and JSON config reading.
- **Bash** exclusively handles heavy filesystem mutations (`.pbxproj`, `build.gradle`, Fastlane, etc.). Node.js MUST NEVER parse native mobile configuration files.

## 2. Brand Agnosticism
- The main React Native directory (`android/`, `ios/`) must **NEVER** contain hardcoded logic for any specific brand.
- The baseline app is a pure template. All brand-specific configuration (colors, images, Firebase keys) must be dynamically injected at build-time using flavor scripts.

## 3. Sandboxed Asset Generation
- When generating images (e.g., bootsplash logos), the CLI MUST do so in a temporary sandbox directory. 
- Assets are then safely copied over to the respective native folders (`android/app/src/main/res`, `ios/Image.xcassets`).
- Direct generation inside the native folders is forbidden, as it pollutes the base template and breaks idempotency.

## 4. Absolute Idempotency
- All bash scripts located in `scripts/` MUST be idempotent.
- Running `init.sh` or `deep-rename.sh` 50 times in a row must yield the exact same codebase state as running it once.
- Scripts must explicitly check if a mutation has already occurred before applying it.

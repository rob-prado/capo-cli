# Skill: Universal Deep Rename

## Purpose
Safely mutate React Native iOS and Android native identifiers to match a new brand configuration. This ensures that the underlying compiled artifacts correctly reflect the active brand inside bundle identifiers, application IDs, and build metadata.

## Architecture Boundary
**Node.js MUST NOT perform these file mutations directly.** 
All native filesystem text replacement is strictly delegated to Bash. The Node.js orchestrator is only responsible for validation and spawning the following command:
`scripts/deep-rename.sh <TARGET_DIR> <OLD_BRAND> <NEW_BRAND>`

## Idempotency and Safety
- **Early Exit:** If the `OLD_BRAND` equals the `NEW_BRAND`, the script detects this and exits gracefully with a success message, ensuring no redundant or corrupting operations occur on already-processed files.
- **Fail-Fast:** The script utilizes strict mode (`set -euo pipefail`). If any part of the file traversal or regex replacement fails, the script will immediately halt to prevent partial corruption of native project files.

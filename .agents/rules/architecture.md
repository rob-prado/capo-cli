# Architectural Rules

These rules define strict architectural boundaries for future agents interacting with or expanding the `capo-cli` project.

## CLI Core
- The CLI entry point is strictly `src/cli.js`. This file must remain lean and solely responsible for bootup mapping.
- Workflows must be aggressively modularized into their own files (e.g., `src/init.js`, `src/create-brand.js`).

## Native & Filesystem Processing
- Native/Filesystem heavy-lifting MUST be delegated to idempotent scripts residing in the `scripts/` directory.
- Future agents MUST NOT attempt to parse complex XML, `.pbxproj`, or Gradle files using pure Node.js `fs` manipulation if `perl` or `bash` tools can execute the mutation natively, safely, and identically across OS environments.

## Architecture Philosophy
- **Separation of Concerns:** Keep JavaScript handling routing and config logic, while Bash handles filesystem mutations.
- **No Monolithic Files:** Do not bloat single JS files or Bash scripts with hundreds of lines. Extract logic into distinct functions or files where it makes logical sense.

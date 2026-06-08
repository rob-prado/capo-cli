# Workflow: run

## Objective
To spin up the local development server and build the application natively for a specific flavor/environment, handling brand injection, port conflict resolution, and parallel execution automatically.

## Inputs/Flags
- `[brand]`: The target brand to run (default: relies on interactive prompt).
- `--env <string>`: The target environment (`dev`, `staging`, `prd`). Default: `dev`.
- `--platform <string>`: The target platform (`ios`, `android`, or `both`). Default: `both`.
- `--port <number>`: Explicit Metro port override (e.g., `8082`).

## Step-by-step Execution Flow
1. **Validation & Context Loading**
   - Reads `capo.config.json` to identify the current `activeBrand`.
   - Validates the requested brand exists in the `/src/config/brands` directory.
   - Determines target ports natively (Android defaults to `8081`, iOS to `8082` when running in parallel).

2. **Pre-flight & Cleanup**
   - Automatically kills any stale processes running on the target ports.
   - Clears Metro cache to prevent stale bundle injections.

3. **Brand Application (Native Delegation)**
   - If the requested brand differs from `activeBrand`, delegates natively to `apply-active-brand.sh`.
   - Ensures iOS Pods are synchronized strictly at the JS Orchestrator boundary (not in the bash scripts) to isolate logic.

4. **External Orchestration (Metro)**
   - Uses `osascript` to launch detached Apple Terminal windows for the Metro Bundler(s), executing `npx react-native start`.
   - Polls the `/status` endpoint until the Metro instances are fully operational.

5. **Execution & Port Isolation**
   - **Android:** Passes `--appIdSuffix` to correctly target flavor-specific `applicationId` (e.g., `.dev`), and injects `--port`.
   - **iOS:** Modifies `.xcode.env.local` to inject `RCT_METRO_PORT`. Because Xcode C++ layers heavily cache this, the orchestrator surgically parses and injects the port directly into `AppDelegate.swift` via AST regex patching before build.
   - Concurrently spawns the React Native CLI commands via `osascript` in independent terminal windows for isolated log streams.

## Expected Outputs & Verification
- 4 Isolated Terminal Windows (if running `both`): 2 for Metro Bundlers, 2 for Native Builds.
- Both iOS and Android Simulator launching side-by-side perfectly themed and communicating with their respective isolated bundlers.

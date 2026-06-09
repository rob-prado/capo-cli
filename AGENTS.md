# AGENTS.md

## Mission
A robust CLI to manage Whitelabel React Native apps using an Agent-First approach. This supreme map serves as the single source of truth for all autonomous AI interactions in this repository.

## Core Architecture
The system operates on the **"JS Orchestrator vs. Bash Executor"** pattern:
- **Node.js (Orchestration/UX):** Handles user interactions, interactive wizard navigation, prompt routing, business logic flow, JSON configuration parsing dynamically, OS-level terminal spawning (`osascript`), dependency validation (e.g. CocoaPods sync), and asynchronous process polling through `src/commands/`.
- **Bash (Native Filesystem Mutation):** Handles deep, heavy-lifting mutations to the underlying Android and iOS project files natively via regex. All reusable mutation logic MUST be strictly decoupled using DRY principles into `scripts/core/` modules (e.g., `scaffold-brand-assets.sh` and `apply-active-brand.sh`). Top-level orchestrators (`init.sh`, `create-brand.sh`) defer to these core modules sequentially.

## The Invariants
1. **Brand Agnosticism:** The main React Native project (`main` folder or root structure) MUST NEVER contain hardcoded brand logic. It must remain a pure base.
2. **Idempotency:** All bash scripts and configuration mutators must be safe to rerun without breaking state or causing infinite recursion.
3. **Sandbox Strategy:** Native asset generation (e.g., bootsplash images) MUST happen in a temporary sandbox. You must never pollute `android/app/src/main/res` or equivalent core structures with flavor-specific artifacts.
4. **Port Isolation Strategy:** React Native packager instances MUST be dynamically isolated during parallel execution (e.g., 8081 for Android, 8082 for iOS). When native Xcode caching ignores dynamic JS variables, AST patching MUST be implemented (e.g., `AppDelegate.swift`) to enforce these physical ports at the hardware level before builds.

## Quality Gates
- **Husky & lint-staged:** All code is guarded by a strict pre-commit hook.
- **ESLint & Prettier:** Strictly enforces semantic linting and standard formatting for JavaScript files.
- **shfmt:** Enforces standard bash formatting rules for all shell scripts.
- **Git Protocol:** The agent must autonomously execute atomic micro-commits under Conventional Commits architecture.

## Universal Directives
- Universal Deep Rename is mandatory for all projects; no shielding for "mature" projects.
- Agents must prioritize generating plans before executing mutations.
- **Isolated Testing:** Agents MUST NEVER run CLI mutation tests inside existing user projects. All validations must be executed in an ephemeral, isolated temporary directory generated via `mktemp -d`.

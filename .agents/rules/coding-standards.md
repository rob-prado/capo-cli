# Coding Standards

This codebase enforces strict automated and manual coding standards. All agents MUST abide by the following:

## JavaScript
- **Modules:** Use ES Modules strictly (`import` and `export`). No `require()` unless dynamically necessary.
- **Formatting:** Prettier will actively strip semicolons. Strictly DO NOT use semicolons (`semi: false`).
- **Quotes:** Use single quotes for strings unless dealing with JSON or string interpolation.
- **Asynchronous Execution:** Always prefer `async/await` over raw `.then()` promises.

## Bash & Shell Scripts
- **Safety First:** `set -euo pipefail` is ABSOLUTELY MANDATORY at the top of every script to ensure strict execution constraints.
- **Regex Mutations:** Always use `perl -pi -e` for regex file mutations. NEVER use `sed` due to severe macOS vs. Linux cross-platform inconsistencies with the `-i` flag.
- **Formatting:** Scripts must follow `shfmt` conventions. Indentation should be 4 spaces.

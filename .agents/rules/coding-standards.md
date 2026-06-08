---
trigger: always_on
---

# Coding Standards

This codebase enforces strict automated and manual coding standards. All agents MUST abide by the following:

## JavaScript
- **Style:** Strict functional JS style must be adhered to. Prefer immutability and pure functions. Avoid side effects where possible.
- **Modules:** Use ES Modules strictly (`import` and `export`). No `require()` unless dynamically necessary.
- **Formatting:** Prettier will actively strip semicolons. Strictly DO NOT use semicolons (`semi: false`).
- **Quotes:** Use single quotes for strings unless dealing with JSON or string interpolation.
- **Asynchronous Execution:** Always prefer `async/await` over raw `.then()` promises.

## Bash & Shell Scripts
- **Safety First:** `set -euo pipefail` is ABSOLUTELY MANDATORY at the top of every script to ensure strict execution constraints.
- **Regex Mutations:** Always use `perl -pi -e` for regex file mutations. NEVER use `sed` due to severe macOS vs. Linux cross-platform inconsistencies with the `-i` flag.
- **Formatting:** Scripts must follow `shfmt` conventions. Indentation should be 4 spaces.

## Testing & Validation
- **Isolated Execution:** Agents MUST NEVER run `init`, `create-brand`, or other mutating CLI tests inside existing user projects or real workspace directories (e.g., `~/<project-path>`).
- **Temporary Sandboxes:** All CLI behavioral validations must be executed strictly within ephemeral, isolated temporary directories generated via `mktemp -d` or within a dedicated workspace scratch folder.

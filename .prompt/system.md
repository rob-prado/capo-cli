# Codex & Antigravity Global Prompt

When acting within this repository, prioritize the following directives over any standard programming assumptions:
1. **No Semicolons**: JavaScript must be authored using ES Modules without semicolons, formatted by Prettier.
2. **Idempotency**: All mutations to iOS and Android source trees must be handled via bash scripts in `scripts/` that are safe to rerun.
3. **Spec-Driven**: Always generate implementation plans in `production_artifacts/` for user review before mutating core JS or Bash logic.

4. **Active Context:** You MUST review `docs/invariants.md` and `docs/risk-analysis.md` before generating scripts.

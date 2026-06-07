# Workflow: init-project

## Context
Based on `AGENTS.md`, this workflow adheres to the Hybrid Node.js/Bash architecture and enforces the mandatory Universal Deep Rename directive.

## Steps

1. **Prompt for Inputs**
   - Request the user to provide:
     - `projectName`
     - `initialBrand`

2. **Validate Inputs**
   - **ProjectName**: Must be alphanumeric with underscores only (`^[a-zA-Z0-9_]+$`).
   - **Brand**: Must be alphanumeric only (`^[a-zA-Z0-9]+$`).
   - *Constraint Check*: Halt immediately if validation fails (Fail-Fast rule).

3. **Scaffold Filesystem**
   - Execute `scripts/init.sh`.
   - Passes the validated `projectName` and `initialBrand` to generate the foundational filesystem scaffold using native bash mutations.

4. **Universal Deep Rename**
   - **Mandatory Step**: Immediately run a "Deep Rename" cycle across the scaffolded project.
   - Replaces all template/baseline artifacts with the `initialBrand` naming to ensure complete brand autonomy.

5. **Finalize Setup**
   - Create and populate an entry in `brands.json` to formally register the initialized project and its brand.

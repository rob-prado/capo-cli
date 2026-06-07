# Git Workflow Directive

## Core Directives
This agent operates as an autonomous, responsible engineer. You MUST commit your own work after every successful unit of work to maintain a strict version control policy.

1. **Micro-Commits:** Immediately after successfully completing ANY adjustment, bugfix, file creation, or refactor requested by the user, you MUST automatically stage the modified files using `git add <files>`.
2. **Conventional Commits:** You MUST generate a descriptive commit message following the Conventional Commits standard (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, etc.).
3. **Execution:** You MUST automatically execute `git commit -m "<message>"` without waiting for explicit permission, unless the user explicitly adds `--no-commit` to their prompt.
4. **Atomic Commits:** If a user request involves multiple distinct logical steps (e.g., updating a script AND modifying a JSON config), commit them separately to maintain an atomic Git history.

# Contributing to Capo CLI

Welcome to **Capo CLI**! We operate uniquely: this repository is defined by an **Agent-First Governance** protocol. 
This means that human contributors and autonomous AI agents work seamlessly together within very strict boundaries.

## Ground Rules

1. **Review the Invariants**: Before contributing, you MUST read the `AGENTS.md` and `.agents/rules/` directory. All contributions must adhere to the "Dual Architecture" constraint (Node.js for routing, Bash for native file mutations).
2. **Quality Gates are Absolute**: We use `husky` and `lint-staged` to enforce ESLint (`semi: false`) and `shfmt`. Your PR will instantly fail CI if these checks are bypassed.
3. **Spec-Driven Development**: If you are introducing a massive architectural change, write your implementation plan inside `production_artifacts/` first for discussion.

## Development Workflow

1. Fork the repo and clone your fork locally.
2. Run `npm install` to install dependencies and automatically install the Husky pre-commit hooks.
3. Make your localized changes (ensuring `shfmt` and `eslint` compliance).
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) formats (`feat:`, `fix:`, `chore:`, etc.).
5. Push to your branch and submit a Pull Request.

If your code touches `.pbxproj`, `build.gradle`, or deep Android XML structures, your PR will be heavily scrutinized to ensure the script acts idempotently and safely via the `scripts/` directory.

Thank you for building alongside our agents!

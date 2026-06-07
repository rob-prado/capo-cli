# Capo CLI 🎩
**An Agent-First React Native Whitelabel CLI**

Welcome to **Capo CLI**, a highly automated, idempotent framework designed to flawlessly bootstrap, manage, and scale Whitelabel React Native applications. Built from the ground up to be completely governed by autonomous AI agents, Capo CLI maintains a robust, highly modular architecture to ensure perfect symmetry across Android and iOS targets.

## ✨ Features

- **Automated Bootstrapping:** Instantly initialize a pristine, multi-flavor React Native project.
- **Idempotent Scaffolding:** Safely rerun mutations without breaking state or causing endless recursion.
- **Dynamic Native Asset Injection:** Automatically injects deeply nested Firebase configurations, Xcode Schemes, and bootsplash configurations safely into `dev`, `staging`, and `prd` environment flavors.
- **Strict Quality Gates:** Completely secured with `husky` pre-commit hooks, `lint-staged`, ESLint, Prettier, and `shfmt` to ensure flawless code formatting for both JS and shell scripts.
- **Agent-First Governance:** The codebase architecture is built with strict boundaries to allow autonomous agents to confidently extend and debug features without human intervention.

## 🏗️ Architecture

Capo CLI strictly enforces a **"Dual Architecture"** pattern to balance interaction and execution:

1. **Node.js Orchestrator:** Handles user interactions, prompt routing, business logic flow, and JSON configuration parsing through an interactive CLI.
2. **Bash Executor:** Reaches deep into the underlying Android and iOS project layers to execute raw, resilient filesystem mutations natively—avoiding the fragility of complex JavaScript filesystem manipulation.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- React Native CLI environment setup (Android Studio, Xcode, CocoaPods)

### Installation
1. Clone the repository and navigate into it:
   ```bash
   git clone <repository-url>
   cd capo-cli
   ```

2. Install dependencies (this will automatically configure Husky pre-commit hooks):
   ```bash
   npm install
   ```

### Running Locally
To launch the interactive orchestrator, simply run:
```bash
npm start
```
Alternatively, execute the CLI entry point directly:
```bash
./src/cli.js
```

## 🛠️ Usage

### `init-project <projectName> <initialBrand>`

This foundational command will scaffold an entirely new React Native project. It performs a "Deep Rename" universally across all iOS namespaces, Xcode schemes, and Android Java package structures. It actively configures multiple environment flavors (`dev`, `staging`, `prd`) natively, synchronizes your environment variables, and safely generates bootsplash splash screens into a temporary sandbox.

**Example:**
```bash
# Handled interactively by running the CLI
npm start
```

---
*Generated autonomously under Agent-First Protocol directives.*

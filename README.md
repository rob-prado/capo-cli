# Capo CLI 🎩
**The Ultimate Toolkit for React Native Whitelabel Applications**
Welcome to **Capo CLI**, a robust, highly automated framework designed to effortlessly bootstrap, manage, and scale Whitelabel React Native applications.
Managing multiple brands, environments (dev, staging, prd), and native configurations inside a single React Native codebase is historically painful. Capo CLI abstracts away the complexity of Xcode schemes, Android package structures, and dynamic asset injection into a set of simple, idempotent commands.
## ✨ Features
 * **Multi-Brand Bootstrapping:** Instantly initialize a pristine React Native project configured out-of-the-box to support multiple flavors and brands.
 * **Dynamic Native Asset Injection:** Automatically and safely injects deeply nested configurations per brand—including google-services.json, GoogleService-Info.plist, App Icons, and bootsplash configurations.
 * **Idempotent Scaffolding:** Safely rerun CLI mutations. The underlying scripts are designed to be idempotent, meaning you can update brand assets without breaking your project state or causing endless recursion.
 * **Deep Renaming Engine:** Seamlessly handles universal renaming across all iOS namespaces, Xcode build phases, and Android Java/Kotlin package structures without manual intervention.
 * **Built for Quality:** Secured with husky pre-commit hooks, lint-staged, ESLint, Prettier, and shfmt to ensure flawless code formatting for both the JS orchestrators and the core shell scripts.

## 📖 The Story Behind Capo CLI

This project is not a recent experiment. It is the distillation of **over three years of hands-on experience** building and maintaining a personal CLI used to manage large ecosystems of whitelabel React Native applications in a corporate environment.

For years, I dealt firsthand with the logistical nightmare of maintaining dozens of brands—each with its own icons, Bundle IDs, Firebase configurations, and Xcode schemes—inside a single repository. The goal was always to achieve this without letting the codebase turn into a tangled mess of conditional rules.

### 🎸 Why "Capo"?
The name carries a deliberate double meaning, which is why it is represented by the classic Italian hat (🎩):

* **The Musical Analogy:** In music, a **capo** is a small device clamped onto the fretboard of a guitar to change its pitch, allowing a musician to play the same chord shapes in a different key. Similarly, Capo CLI acts as a clamp over your repository. It dynamically shifts the "pitch" of your application—swapping native assets, bundle identifiers, and environment configurations—so your single React Native codebase can effortlessly "play" multiple brands without rewriting core logic.
* **The Command Analogy:** In Italian culture and mafia terminology, a **Capo** (short for *caporegime*) is a high-ranking boss who coordinates operations and commands with absolute authority. Capo CLI embodies this persona—it acts as the ultimate boss of your whitelabel architecture, ruthlessly and flawlessly orchestrating complex native mutations across iOS and Android layers without questioning or failing.

### 🤖 The Agent-First Renaissance
While the original CLI solved the whitelabel problem, the legacy code became increasingly difficult to scale. That is why I decided to **rewrite the tool entirely from scratch**, this time adopting an **Agent-First** architecture.

The entire foundation of the current Capo CLI was designed to be natively governed and expanded by autonomous AI agents (such as Google Antigravity 2.0). What you see today combines the resilience of years of "production-tested" workflows with the cutting-edge of agentic software engineering, resulting in an incredibly modular, secure, and easy-to-evolve framework.

## 🏗️ Architecture
Capo CLI strictly enforces a **"Dual Architecture"** pattern to ensure safety and stability when manipulating native code:
 1. **Node.js Orchestrator (Command Loader):** Uses a highly scalable dynamic Command Loader pattern (src/commands/). It handles the developer experience (DX): user interactions, prompt routing, input validation, and execution delegation.
 2. **Bash Executor (Core Modules):** Reaches deep into the underlying Android and iOS project layers to execute raw, resilient filesystem mutations natively. Complex filesystem logic is abstracted into modular bash scripts like scaffold-brand-assets.sh and apply-active-brand.sh to ensure perfect symmetry across OS targets.
## 🚀 Getting Started
### Prerequisites
 * Node.js
 * npm or yarn
 * Standard React Native CLI environment setup (Android Studio, Xcode, CocoaPods)

### 🌍 Global Installation

To use the `capo` command from anywhere in your system, we recommend moving the project to your user's home directory and creating a global symlink. This prevents accidental deletions and keeps your workspace clean.

**1. Move or clone the repository to your Home directory:**

- Clone the repository and navigate into it:
```bash
git clone https://github.com/rob-prado/capo-cli
```

- If you have already cloned the repository, move it to a safe location (e.g., `~/.capo-cli`):
```bash
mv capo-cli ~/.capo-cli
cd ~/.capo-cli
```

**2. Install dependencies and link the CLI globally:**
```bash
npm install
npm link
```
**3. Verify the installation:**
Once linked, the CLI is available globally. Test it by running:
```bash
capo --help
```
*Note: If you encounter permission issues during npm link, you might need to run it with sudo or configure npm to use a different directory.*

### Updating
To get the latest features and bug fixes, simply pull the latest changes in your installation directory:
```bash
cd ~/.capo-cli
git pull
```

### Running Locally
To launch the interactive orchestrator, simply run:
```bash
npm start
```
Alternatively, execute the CLI entry point directly:
```bash
capo --action=init
```

## 🛠️ Usage
Capo CLI dynamically loads commands to manage your whitelabel lifecycle.
### init
```bash
capo --action=init --projectName=<Name> --initialBrand=<Brand>
```

This foundational command scaffolds an entirely new Whitelabel-ready React Native project. It performs a universal "Deep Rename" to set up your core namespaces, configures multiple environment flavors (dev, staging, prd) natively, and distributes the initial brand configurations.

### create-brand
```bash
cd <your React Native project path>
capo --action=create-brand --brandName=<Brand>
```

Generates a new brand within an existing Capo-managed project. It safely clones base templates, stages the new brand's resources, and sets up the necessary hooks so you can easily switch between brands. It handles the heavy lifting of distributing iOS and Android assets into their respective native directories dynamically.
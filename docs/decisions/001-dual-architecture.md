# ADR 001: The Dual Architecture Approach

## Context
When building an Agent-First React Native CLI, we faced a major architectural hurdle: how do we interact with users cleanly (prompts, JSON reading, state) while simultaneously executing massive, highly dangerous mutations across complex iOS `.pbxproj` trees and Android `build.gradle` structures?

## Decision
We decided to strictly split the architecture into two distinct environments:
1. **Node.js (Orchestrator):** Exclusively handles terminal UI (Inquirer), prompt routing, and JSON configuration injection.
2. **Bash (Executor):** Exclusively handles native filesystem mutations.

## Rationale
- Parsing `.pbxproj` or complex XML natively in Node.js requires massive third-party dependencies (like `xcode` or xml parsers) that are highly fragile and prone to breaking during React Native version updates.
- Unix tools (`perl`, `bash`, `find`) are native, resilient, and universally capable of safely replacing strings and moving directories identically across systems. 
- By explicitly drawing this boundary, we prevent future autonomous AI agents from attempting to write complex NodeJS logic for tasks that are inherently simpler and safer in Bash.

## Consequences
- **Positive:** Maximum resilience when modifying native React Native files. Agents can safely manage bash scripts.
- **Negative:** We must maintain two distinct language environments (JS and Bash). Strict `shfmt` and ESLint rules must be maintained simultaneously.

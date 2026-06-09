# Core Workflows

The following diagrams map the internal execution boundaries of the Capo CLI workflows, demonstrating the new decoupled Dual Architecture.

## Initial Project Scaffold (`init`) & Brand Creation (`create-brand`)

The Node.js Command Loader handles routing and interacts securely with the underlying unified Bash Executor core modules.

```mermaid
sequenceDiagram
    participant User
    participant CLI as Node.js (src/cli.js)
    participant Command as Node.js (src/commands/)
    participant Orchestrator as Bash Orchestrator (init.sh / create-brand.sh)
    participant ScaffoldAssets as Bash Core (scaffold-brand-assets.sh)
    participant ApplyBrand as Bash Core (apply-active-brand.sh)
    
    User->>CLI: run `capo`
    CLI->>Command: Dynamically load & route command
    Command->>User: Wizard Utility (Prompt with Back/Quit)
    User-->>Command: Validated Arguments
    
    rect rgb(200, 220, 240)
    Note over Command, ApplyBrand: Native Execution Boundary (Bash)
    Command->>Orchestrator: Spawn execution
    
    Orchestrator->>ScaffoldAssets: Clone templates & distribute resources natively
    ScaffoldAssets-->>Orchestrator: Stage Complete
    
    Orchestrator->>ApplyBrand: Inject brand config (Bootsplash, App.tsx, Deep Rename)
    ApplyBrand-->>Orchestrator: Native Application Complete
    
    Orchestrator-->>Command: Exit Code 0
    end
    
    Command->>User: "Workflow Completed Successfully!"
```

## Run Orchestrator (`run`)

The `run` command operates at the boundary of JS and Bash. The JS Orchestrator actively manages async states, terminal spawning, and dependency validation before dispatching parallel builds.

```mermaid
sequenceDiagram
    participant User
    participant RunJS as Node.js (run.js)
    participant AppleScript as OS Terminal
    participant ApplyBrand as Bash Core (apply-active-brand.sh)
    
    User->>RunJS: run `capo run both`
    RunJS->>RunJS: Validate Environment & Active Brand
    
    opt Brand Changed
        rect rgb(200, 220, 240)
        Note over RunJS, ApplyBrand: Native Execution Boundary (Bash)
        RunJS->>ApplyBrand: Apply New Brand Identifiers
        ApplyBrand-->>RunJS: Native Application Complete
        end
    end

    RunJS->>RunJS: Validate iOS Pods
    opt Pods Missing or Brand Changed
        RunJS->>RunJS: Execute `bundle exec pod install`
    end

    RunJS->>AppleScript: Launch Android Metro (Port 8081)
    RunJS->>AppleScript: Launch iOS Metro (Port 8082)
    
    Note over RunJS: Async Polling for Metro /status
    
    RunJS->>AppleScript: Launch `run-android` (AppId Injection)
    RunJS->>RunJS: Inject Port to `AppDelegate.swift`
    RunJS->>AppleScript: Launch `run-ios`
    
    RunJS->>User: "Workflow `run` completed successfully"
```

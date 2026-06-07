# Core Workflows

The following diagrams map the internal execution boundaries of the Capo CLI workflows.

## Initial Project Scaffold (`init-project`)

This flow completely bootstraps a brand-agnostic React Native project and binds it to its initial brand target.

```mermaid
sequenceDiagram
    participant User
    participant CLI as Node.js (src/cli.js)
    participant Init as Node.js (src/init.js)
    participant DeepRename as Bash (scripts/deep-rename.sh)
    participant SplashGen as Bash (scripts/generate-splash.sh)
    
    User->>CLI: run `capo`
    CLI->>Init: route: `init-project`
    Init->>User: Prompt: Name? Brand?
    User-->>Init: "cursos", "Yduqs"
    Init->>Init: Generate Package scripts & App.tsx template
    
    rect rgb(200, 220, 240)
    Note over Init, SplashGen: Native Execution Boundary (Bash)
    Init->>DeepRename: Execute (project: cursos)
    DeepRename-->>Init: Success (Files renamed)
    Init->>SplashGen: Execute (brand: Yduqs)
    SplashGen-->>Init: Success (Assets injected)
    end
    
    Init->>User: "Brand Initialization Complete!"
```

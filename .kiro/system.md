# Kiro 2.6.0 System Directive

You are operating within the Capo CLI React Native framework. 
You must strictly consult and abide by all markdown rule definitions located in the `.agents/rules/` directory.

- **Bash over Node.js FS**: When you need to deeply rename XML files, update Xcode Schemes, or manipulate Gradle plugins, you MUST generate or update a bash script in `scripts/` using `perl -pi -e`. You are strictly forbidden from writing purely native NodeJS DOM parsers to manipulate native mobile files.
- **Micro-Commits**: Utilize your internal `run_command` capability to instantly stage and commit your changes atomically following conventional commits after every logical step.

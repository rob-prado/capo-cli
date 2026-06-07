#!/usr/bin/env node
/**
 * Orchestrates the initialization of a new project.
 * Implements the Node.js side of the init-project workflow.
 */

import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import inquirer from 'inquirer'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Validates the project name.
 * Constraint: Must be alphanumeric with underscores only.
 *
 * @param {string} name - The project name to validate.
 * @returns {boolean|string} True if valid, error message otherwise.
 */
export function isValidProjectName(name) {
  if (typeof name !== 'string' || name.length === 0)
    return 'Project name cannot be empty.'
  const regex = /^[a-zA-Z0-9_]+$/
  return regex.test(name) ? true : 'Must be alphanumeric and underscores only.'
}

/**
 * Validates the brand name.
 * Constraint: Must be alphanumeric only.
 *
 * @param {string} brand - The brand name to validate.
 * @returns {boolean|string} True if valid, error message otherwise.
 */
export function isValidBrand(brand) {
  if (typeof brand !== 'string' || brand.length === 0)
    return 'Brand name cannot be empty.'
  const regex = /^[a-zA-Z0-9]+$/
  return regex.test(brand) ? true : 'Must be alphanumeric only.'
}

/**
 * Executes the bash scaffolding script.
 *
 * @param {string} projectName - The validated project name.
 * @param {string} initialBrand - The validated initial brand name.
 * @throws {Error} If the bash script fails to spawn or exits with a non-zero code.
 */
function runScaffoldScript(projectName, initialBrand) {
  // Assumes execution context is from project root or handles absolute pathing
  const scriptPath = path.resolve(__dirname, '../scripts/init.sh')

  console.log(
    chalk.blue(
      `\n[Orchestrator] Triggering scaffold script for ${projectName}...`,
    ),
  )

  const result = spawnSync('bash', [scriptPath, projectName, initialBrand], {
    stdio: 'inherit',
    encoding: 'utf-8',
  })

  if (result.error) {
    throw new Error(`Failed to spawn init.sh: ${result.error.message}`)
  }

  if (result.status !== 0) {
    throw new Error(`init.sh exited with status code ${result.status}`)
  }
}

/**
 * Executes the Universal Deep Rename bash script.
 * Delegates the native mutation safely to the bash boundary.
 *
 * @param {string} targetDir - The directory of the newly scaffolded project.
 * @param {string} newBrand - The initial brand name to apply to the native configuration.
 * @throws {Error} If the deep rename script fails to spawn or exits with a non-zero code.
 */
function runDeepRename(targetDir, newBrand) {
  const scriptPath = path.resolve(__dirname, '../scripts/deep-rename.sh')

  console.log(
    chalk.blue(
      `\n[Orchestrator] Triggering Universal Deep Rename for brand '${newBrand}'...`,
    ),
  )

  // Note: We deliberately pass only 2 arguments so the bash script deduces OLD_BRAND from app.json
  const result = spawnSync('bash', [scriptPath, targetDir, newBrand], {
    stdio: 'inherit',
    encoding: 'utf-8',
  })

  if (result.error) {
    throw new Error(`Failed to spawn deep-rename.sh: ${result.error.message}`)
  }

  if (result.status !== 0) {
    throw new Error(`deep-rename.sh exited with status code ${result.status}`)
  }
}

/**
 * Main workflow entry function.
 *
 * @param {string} projectName - The raw project name input.
 * @param {string} initialBrand - The raw brand name input.
 */
export function initProject(projectName, initialBrand) {
  console.log(chalk.green('\n--- Initializing Greenfield Project ---'))

  // 1. Validate Inputs programmatically if skipping prompts
  if (isValidProjectName(projectName) !== true) {
    console.error(
      chalk.red(
        'Fatal: Invalid projectName. Must be alphanumeric and underscores only.',
      ),
    )
    process.exit(1)
  }

  if (isValidBrand(initialBrand) !== true) {
    console.error(
      chalk.red('Fatal: Invalid initialBrand. Must be alphanumeric only.'),
    )
    process.exit(1)
  }

  // 2. Execute Scaffold Step
  try {
    runScaffoldScript(projectName, initialBrand)

    // 3. Trigger Universal Deep Rename cycle
    runDeepRename(projectName, initialBrand)

    console.log(
      chalk.green.bold('\nWorkflow `init-project` completed successfully.'),
    )
  } catch (error) {
    console.error(chalk.red(`\nFatal Workflow Error: ${error.message}`))
    process.exit(1)
  }
}

// Allow script execution directly from CLI with interactive prompts (Fallback)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ;(async () => {
    console.log(chalk.cyan.bold('Welcome to Capo CLI'))

    const args = process.argv.slice(2)

    // If arguments are provided directly via CLI
    if (args.length >= 2) {
      initProject(args[0], args[1])
      return
    }

    // Otherwise prompt interactively
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Enter the project name:',
        validate: isValidProjectName,
      },
      {
        type: 'input',
        name: 'initialBrand',
        message: 'Enter the initial brand name:',
        validate: isValidBrand,
      },
    ])

    initProject(answers.projectName, answers.initialBrand)
  })()
}

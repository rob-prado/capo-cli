import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import inquirer from 'inquirer'
import chalk from 'chalk'
import { isValidProjectName, isValidBrand } from '../utils/validators.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Executes the bash scaffolding script.
 *
 * @param {string} projectName - The validated project name.
 * @param {string} initialBrand - The validated initial brand name.
 * @throws {Error} If the bash script fails to spawn or exits with a non-zero code.
 */
function runScaffoldScript(projectName, initialBrand, configJson) {
  const scriptPath = path.resolve(__dirname, '../../scripts/init.sh')
  console.log(
    chalk.blue(
      `\n[Orchestrator] Triggering scaffold script for ${projectName}...`,
    ),
  )

  const result = spawnSync('bash', [scriptPath, projectName, initialBrand], {
    stdio: 'inherit',
    encoding: 'utf-8',
    env: { ...process.env, BRAND_CONFIG_JSON: configJson },
  })

  if (result.error) {
    throw new Error(`Failed to spawn init.sh: ${result.error.message}`)
  }

  if (result.status !== 0) {
    throw new Error(`init.sh exited with status code ${result.status}`)
  }
}

export default {
  name: 'init',
  description: 'Initialize a new project',
  run: async (args) => {
    console.log(chalk.green('\n--- Initializing Greenfield Project ---'))

    let { projectName, initialBrand } = args

    const prompts = []
    if (!projectName) {
      prompts.push({
        type: 'input',
        name: 'projectName',
        message: 'Enter the project name:',
        validate: isValidProjectName,
      })
    }
    if (!initialBrand) {
      prompts.push({
        type: 'input',
        name: 'initialBrand',
        message: 'Enter the initial brand name:',
        validate: isValidBrand,
      })
    }

    if (prompts.length > 0) {
      const answers = await inquirer.prompt(prompts)
      if (!projectName) projectName = answers.projectName
      if (!initialBrand) initialBrand = answers.initialBrand
    }

    // Validate inputs
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

    let { bundleId, primaryColor } = args

    if (!bundleId) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'bundleId',
          message: 'Enter the initial bundle ID (e.g., com.example.app):',
          default: `com.example.${initialBrand.toLowerCase()}`,
        },
      ])
      bundleId = answers.bundleId
    }

    if (!primaryColor) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'primaryColor',
          message: 'Enter the initial primary color (hex, e.g., #FFFFFF):',
          default: '#FFFFFF',
        },
      ])
      primaryColor = answers.primaryColor
    }

    const brandConfig = {
      [initialBrand]: {
        bundleId,
        primaryColor,
        android: {
          versionName: '1.0.0',
          versionCode: 1,
        },
        ios: {
          versionNumber: '1.0.0',
          buildNumber: 1,
        },
      },
    }
    const configJson = JSON.stringify(brandConfig, null, 2)

    try {
      runScaffoldScript(projectName, initialBrand, configJson)
      console.log(
        chalk.green.bold('\nWorkflow `init-project` completed successfully.'),
      )
    } catch (error) {
      console.error(chalk.red(`\nFatal Workflow Error: ${error.message}`))
      process.exit(1)
    }
  },
}

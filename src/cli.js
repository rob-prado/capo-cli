#!/usr/bin/env node
/**
 * Main entry point for the Capo CLI.
 * Handles the top-level orchestration, presenting the initial action menu,
 * parsing CLI flags, and routing to the appropriate workflow sub-modules.
 */

import inquirer from 'inquirer'
import chalk from 'chalk'
import { questions } from './questions.js'
import { initProject } from './init.js'
import { createBrand } from './create-brand.js'

/**
 * Parses command line arguments into an object of key-value pairs.
 * Expected format: `--key=value` or boolean `--flag`.
 *
 * @param {string[]} args - The raw process.argv array slice.
 * @returns {Record<string, string|boolean>} The parsed arguments map.
 */
function parseArgs(args) {
  const parsed = {}
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=')
      parsed[key] = valueParts.length > 0 ? valueParts.join('=') : true
    }
  }
  return parsed
}

/**
 * Initializes and runs the CLI orchestrator.
 * Uses parsed CLI flags to bypass interactive prompts when explicitly provided,
 * and routes execution to the correct workflow logic.
 *
 * @returns {Promise<void>}
 */
async function runCLI() {
  console.log(chalk.cyan.bold('Welcome to Capo CLI'))

  try {
    const args = parseArgs(process.argv.slice(2))

    // 1. Determine top-level action (Bypass prompt if provided via --action)
    let action = args.action
    if (!action) {
      const answer = await inquirer.prompt([questions.action])
      action = answer.action
    }

    // 2. Route based on the selected action
    switch (action) {
      case 'init': {
        // Determine which inputs are missing and require user interaction
        const prompts = []
        if (!args.projectName) prompts.push(questions.projectName)
        if (!args.initialBrand) prompts.push(questions.initialBrand)

        // Prompt only for the missing values
        const answers = prompts.length > 0 ? await inquirer.prompt(prompts) : {}

        // Merge CLI flags with interactive answers
        const projectName = args.projectName || answers.projectName
        const initialBrand = args.initialBrand || answers.initialBrand

        // Execute the init workflow
        initProject(projectName, initialBrand)
        break
      }

      case 'create-brand': {
        const brandName = args.brandName
        await createBrand(brandName)
        break
      }

      case 'run':
      case 'pack':
      case 'release':
        console.log(
          chalk.yellow(
            `\nFeature '${action}' is under construction in the Agent-First architecture.`,
          ),
        )
        process.exit(0)
        break

      default:
        console.error(chalk.red(`\nUnknown action selected: ${action}`))
        process.exit(1)
    }
  } catch (error) {
    // Catch any prompt interruptions or generic runtime errors
    console.error(chalk.red(`\nCLI Error: ${error.message}`))
    process.exit(1)
  }
}

// Execute the main orchestrator
runCLI()

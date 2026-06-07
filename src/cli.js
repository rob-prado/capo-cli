#!/usr/bin/env node
/**
 * Main entry point for the Capo CLI.
 * Uses a dynamic Command Loader pattern to fetch and execute workflows
 * based on the user's current initialization state.
 */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import chalk from 'chalk'
import { loadCommands } from './commands/index.js'

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
 * Checks if the current working directory is an initialized project.
 *
 * @returns {boolean} True if package.json exists.
 */
function isProjectInitialized() {
  return fs.existsSync(path.resolve(process.cwd(), 'package.json'))
}

/**
 * Initializes and runs the dynamic CLI orchestrator.
 *
 * @returns {Promise<void>}
 */
async function runCLI() {
  console.log(chalk.cyan.bold('Welcome to Capo CLI'))

  try {
    const args = parseArgs(process.argv.slice(2))
    const allCommands = await loadCommands()
    const isInitialized = isProjectInitialized()

    // Filter commands based on current directory context
    const availableCommands = allCommands.filter(
      (cmd) => cmd.requireInit === isInitialized,
    )

    let action = args.action

    if (!action) {
      if (availableCommands.length === 0) {
        console.log(chalk.yellow('No actions available for this context.'))
        process.exit(0)
      }

      // Dynamically construct Inquirer choices from the loaded commands
      const choices = availableCommands.map((cmd) => ({
        name: chalk.green(cmd.description),
        value: cmd.name,
      }))

      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: chalk.blue('What would you like to do?'),
          choices,
        },
      ])
      action = answer.action
    }

    // Lookup the selected command
    const targetCommand = availableCommands.find((cmd) => cmd.name === action)

    if (!targetCommand) {
      console.error(
        chalk.red(
          `\nUnknown or unavailable action selected for this context: ${action}`,
        ),
      )
      process.exit(1)
    }

    // Execute the command's dynamic run function, passing the parsed args
    await targetCommand.run(args)
  } catch (error) {
    console.error(chalk.red(`\nCLI Error: ${error.message}`))
    process.exit(1)
  }
}

runCLI()

#!/usr/bin/env node
/**
 * Main entry point for the Capo CLI.
 * Uses a dynamic Command Loader pattern to fetch and execute workflows
 * based on the user's current initialization state.
 */

import inquirer from 'inquirer'
import chalk from 'chalk'
import { loadCommands } from './commands/index.js'
import { isCapoProject } from './utils/validators.js'

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
 * Initializes and runs the dynamic CLI orchestrator.
 *
 * @returns {Promise<void>}
 */
async function runCLI() {
  console.log(chalk.cyan.bold('Welcome to Capo CLI'))

  try {
    const args = parseArgs(process.argv.slice(2))

    // CONDITION A: Outside a project
    if (!isCapoProject()) {
      console.log(
        chalk.yellow(
          '\nNo Capo project detected in this directory. Starting initialization...',
        ),
      )
      const allCommands = await loadCommands()
      const initCommand = allCommands.find((cmd) => cmd.name === 'init')
      if (initCommand) {
        await initCommand.run(args)
      } else {
        console.error(chalk.red('Fatal: Init command not found.'))
        process.exit(1)
      }
      return
    }

    // CONDITION B: Inside a project
    const allCommands = await loadCommands()
    // STRICTLY filter out the `init` command
    const availableCommands = allCommands.filter((cmd) => cmd.name !== 'init')

    if (availableCommands.length === 0) {
      console.log(chalk.yellow('No actions available for this context.'))
      process.exit(0)
    }

    let action = args.action

    if (action) {
      // Non-interactive mode (action passed via args)
      const targetCommand = availableCommands.find((cmd) => cmd.name === action)

      if (!targetCommand) {
        console.error(
          chalk.red(
            `\nUnknown or unavailable action selected for this context: ${action}`,
          ),
        )
        process.exit(1)
      }

      await targetCommand.run(args)
      return
    }

    // Interactive mode: Loop until the user chooses to quit
    while (true) {
      const choices = availableCommands.map((cmd) => ({
        name: chalk.green(cmd.description),
        value: cmd.name,
      }))

      choices.push(new inquirer.Separator())
      choices.push({ name: chalk.red('Quit'), value: 'quit' })

      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: chalk.blue('What would you like to do?'),
          choices,
        },
      ])

      if (answer.action === 'quit') {
        console.log(chalk.cyan('Goodbye!'))
        process.exit(0)
      }

      const targetCommand = availableCommands.find(
        (cmd) => cmd.name === answer.action,
      )

      if (!targetCommand) {
        console.error(chalk.red(`\nUnknown action: ${answer.action}`))
        continue
      }

      await targetCommand.run(args)
      console.log('\n') // Add some spacing before next prompt
    }
  } catch (error) {
    console.error(chalk.red(`\nCLI Error: ${error.message}`))
    process.exit(1)
  }
}

runCLI()

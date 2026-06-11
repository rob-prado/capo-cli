import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import { runWizard } from '../utils/wizard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Executes the bash clean script.
 *
 * @param {string} target - The target to clean.
 * @throws {Error} If the bash script fails to spawn or exits with a non-zero code.
 */
function runCleanScript(target) {
  const scriptPath = path.resolve(
    __dirname,
    '../../scripts/core/clean-build-env.sh',
  )
  console.log(
    chalk.blue(
      `\n[Orchestrator] Triggering clean script for target: ${target}...`,
    ),
  )

  const result = spawnSync('bash', [scriptPath, target], {
    stdio: 'inherit',
    encoding: 'utf-8',
    env: { ...process.env },
  })

  if (result.error) {
    throw new Error(
      `Failed to spawn clean-build-env.sh: ${result.error.message}`,
    )
  }

  if (result.status !== 0) {
    throw new Error(
      `clean-build-env.sh exited with status code ${result.status}`,
    )
  }
}

export default {
  name: 'clean',
  description: 'Aggressively clean build caches and environments',
  run: async (args) => {
    console.log(chalk.green('\n--- Self-Healing Clean Command ---'))

    let target = args.target

    if (!target) {
      const prompts = [
        {
          type: 'list',
          name: 'target',
          message: 'What do you want to clean?',
          choices: [
            { name: 'Everything (Android, iOS, Metro, Capo)', value: 'all' },
            { name: 'Android Only', value: 'android' },
            { name: 'iOS Only', value: 'ios' },
            { name: 'Metro Bundler Caches Only', value: 'metro' },
            { name: 'Capo CLI Staging Folders Only', value: 'capo' },
          ],
        },
      ]

      const answers = await runWizard(prompts)
      if (!answers) return

      target = answers.target
    }

    try {
      runCleanScript(target)
      console.log(
        chalk.green.bold('\nWorkflow `clean` completed successfully.'),
      )
    } catch (error) {
      console.error(chalk.red(`\nFatal Workflow Error: ${error.message}`))
      process.exit(1)
    }
  },
}

import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

import chalk from 'chalk'
import { fileURLToPath } from 'url'
import { isValidBrand } from '../utils/validators.js'
import { runWizard } from '../utils/wizard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Executes the bash executor script to scaffold the new brand assets.
 *
 * @param {string} brandName - The validated brand name.
 */
function runCreateBrandScript(brandName, configJson) {
  const scriptPath = path.resolve(__dirname, '../../scripts/create-brand.sh')
  console.log(
    chalk.blue(
      `\n[Orchestrator] Triggering brand scaffold for ${brandName}...`,
    ),
  )

  const result = spawnSync('bash', [scriptPath, brandName], {
    stdio: 'inherit',
    encoding: 'utf-8',
    env: { ...process.env, BRAND_CONFIG_JSON: configJson },
  })

  if (result.error) {
    throw new Error(`Failed to spawn create-brand.sh: ${result.error.message}`)
  }

  if (result.status !== 0) {
    throw new Error(`create-brand.sh exited with status code ${result.status}`)
  }
}

export default {
  name: 'create-brand',
  description: 'Create a new Brand',
  run: async (args) => {
    console.log(chalk.green('\n--- Creating New Brand ---'))

    const cwd = process.cwd()
    const brandsJsonPath = path.resolve(cwd, 'brands.json')

    // Validate initialization (redundant check, but safe)
    if (!fs.existsSync(brandsJsonPath)) {
      console.error(
        chalk.red(
          'Fatal: brands.json not found. Are you inside an initialized Capo project?',
        ),
      )
      process.exit(1)
    }

    let finalBrand = args.brandName
    let bundleId = args.bundleId
    let primaryColor = args.primaryColor

    const brandsData = JSON.parse(fs.readFileSync(brandsJsonPath, 'utf8'))

    // Pre-flight check for CLI args
    if (finalBrand) {
      if (isValidBrand(finalBrand) !== true) {
        console.error(
          chalk.red('Fatal: Invalid brand name. Must be alphanumeric only.'),
        )
        process.exit(1)
      }
      if (brandsData.brands.includes(finalBrand)) {
        console.error(
          chalk.red(
            `Fatal: Brand '${finalBrand}' already exists in brands.json.`,
          ),
        )
        process.exit(1)
      }
    }

    const prompts = []

    // Interactive Prompt if missing
    if (!finalBrand) {
      prompts.push({
        type: 'input',
        name: 'brandName',
        message: 'Enter the new brand name:',
        validate: (input) => {
          const res = isValidBrand(input)
          if (res !== true) return res
          if (brandsData.brands.includes(input))
            return `Brand '${input}' already exists.`
          return true
        },
      })
    }

    if (!bundleId) {
      prompts.push({
        type: 'input',
        name: 'bundleId',
        message: 'Enter the bundle ID (e.g., com.example.brand):',
        default: (answers) =>
          `com.example.${(answers.brandName || finalBrand || 'brand').toLowerCase()}`,
      })
    }

    if (!primaryColor) {
      prompts.push({
        type: 'input',
        name: 'primaryColor',
        message: 'Enter the primary color (hex, e.g., #FFFFFF):',
        default: '#FFFFFF',
      })
    }

    if (prompts.length > 0) {
      const answers = await runWizard(prompts)
      if (!answers) return

      if (!finalBrand) finalBrand = answers.brandName
      if (!bundleId) bundleId = answers.bundleId
      if (!primaryColor) primaryColor = answers.primaryColor
    }

    const brandConfig = {
      [finalBrand]: {
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

    // Execute
    try {
      runCreateBrandScript(finalBrand, configJson)
      console.log(
        chalk.green.bold('\nWorkflow `create-brand` completed successfully.'),
      )
    } catch (error) {
      console.error(chalk.red(`\nFatal Workflow Error: ${error.message}`))
      process.exit(1)
    }
  },
}

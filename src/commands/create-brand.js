import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import inquirer from 'inquirer'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import { isValidBrand } from '../utils/validators.js'

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

    // Interactive Prompt if missing
    if (!finalBrand) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'newBrand',
          message: 'Enter the new brand name:',
          validate: isValidBrand,
        },
      ])
      finalBrand = answers.newBrand
    } else {
      // Validate CLI arg
      if (isValidBrand(finalBrand) !== true) {
        console.error(
          chalk.red('Fatal: Invalid brand name. Must be alphanumeric only.'),
        )
        process.exit(1)
      }
    }

    // Pre-flight check: Prevent overwriting existing brands
    const brandsData = JSON.parse(fs.readFileSync(brandsJsonPath, 'utf8'))
    if (brandsData.brands.includes(finalBrand)) {
      console.error(
        chalk.red(
          `Fatal: Brand '${finalBrand}' already exists in brands.json.`,
        ),
      )
      process.exit(1)
    }

    let bundleId = args.bundleId
    if (!bundleId) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'bundleId',
          message: 'Enter the bundle ID (e.g., com.example.brand):',
          default: `com.example.${finalBrand.toLowerCase()}`,
        },
      ])
      bundleId = answers.bundleId
    }

    let primaryColor = args.primaryColor
    if (!primaryColor) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'primaryColor',
          message: 'Enter the primary color (hex, e.g., #FFFFFF):',
          default: '#FFFFFF',
        },
      ])
      primaryColor = answers.primaryColor
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

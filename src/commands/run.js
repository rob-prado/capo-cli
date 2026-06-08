import { spawn, spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import inquirer from 'inquirer'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Applies the selected brand natively using the bash executor.
 *
 * @param {string} cwd - The current working directory.
 * @param {string} targetBrand - The brand to apply.
 * @param {string} oldBrand - The currently active brand.
 */
function applyBrand(cwd, targetBrand, oldBrand) {
  const scriptPath = path.resolve(
    __dirname,
    '../../scripts/core/apply-active-brand.sh',
  )
  console.log(chalk.blue(`\n[Orchestrator] Applying brand '${targetBrand}'...`))

  const result = spawnSync('bash', [scriptPath, cwd, targetBrand, oldBrand], {
    stdio: 'inherit',
    encoding: 'utf-8',
  })

  if (result.error) {
    throw new Error(
      `Failed to spawn apply-active-brand.sh: ${result.error.message}`,
    )
  }

  if (result.status !== 0) {
    throw new Error(
      `apply-active-brand.sh exited with status code ${result.status}`,
    )
  }
}

/**
 * Runs the React Native application.
 *
 * @param {string} cwd - The current working directory.
 * @param {string} platform - 'android' or 'ios'.
 * @param {string} environment - 'dev', 'staging', or 'prd'.
 * @param {string} brandName - The active brand name.
 */
function runReactNative(cwd, platform, environment, brandName) {
  console.log(
    chalk.blue(
      `\n[Orchestrator] Running React Native on ${platform.toUpperCase()} (${environment.toUpperCase()})...`,
    ),
  )

  let command = 'npx'
  let args = ['@react-native-community/cli']

  if (platform === 'android') {
    args.push('run-android')
    args.push(`--mode=${environment}Debug`)
  } else if (platform === 'ios') {
    args.push('run-ios')
    // Map environment to scheme (Assuming Dev and Prod are the standard generated schemes)
    const schemeSuffix = environment === 'dev' ? 'Dev' : 'Prod'
    args.push(`--scheme=${brandName}${schemeSuffix}`)
  }

  return new Promise((resolve, reject) => {
    // DRY-RUN MOCK INJECTION: If DRY_RUN env is set, just print the command
    if (process.env.DRY_RUN) {
      console.log(
        chalk.yellow(`[Dry Run] Would execute: ${command} ${args.join(' ')}`),
      )
      return resolve()
    }

    const child = spawn(command, args, { cwd })
    let buildFailed = false

    child.stdout.on('data', (data) => {
      process.stdout.write(data)
      const output = data.toString()
      if (
        output.includes('BUILD FAILED') ||
        output.includes('Failed to build ios project') ||
        output.includes('xcodebuild" exited with error code')
      ) {
        buildFailed = true
      }
    })

    child.stderr.on('data', (data) => {
      process.stderr.write(data)
      const output = data.toString()
      if (
        output.includes('BUILD FAILED') ||
        output.includes('Failed to build ios project') ||
        output.includes('xcodebuild" exited with error code')
      ) {
        buildFailed = true
      }
    })

    child.on('error', (error) => {
      reject(new Error(`Failed to spawn React Native: ${error.message}`))
    })

    child.on('close', (code) => {
      if (code !== 0) {
        if (buildFailed) {
          reject(
            new Error(`React Native build failed with status code ${code}`),
          )
        } else {
          console.warn(
            chalk.yellow(
              `\n[Orchestrator] React Native execution finished with status code ${code}. (Note: ADB/Simulator launch errors are common and ignored since the build did not fail).`,
            ),
          )
          resolve()
        }
      } else {
        resolve()
      }
    })
  })
}

export default {
  name: 'run',
  description: 'Run the project',
  run: async (args) => {
    console.log(chalk.green('\n--- Run Application ---'))

    const cwd = process.cwd()
    const brandsJsonPath = path.resolve(cwd, 'brands.json')

    if (!fs.existsSync(brandsJsonPath)) {
      console.error(
        chalk.red(
          'Fatal: brands.json not found. Are you inside an initialized Capo project?',
        ),
      )
      process.exit(1)
    }

    const brandsData = JSON.parse(fs.readFileSync(brandsJsonPath, 'utf8'))
    const availableBrands = brandsData.brands || []
    const oldBrand = brandsData.activeBrand || availableBrands[0]

    if (availableBrands.length === 0) {
      console.error(chalk.red('Fatal: No brands registered in brands.json.'))
      process.exit(1)
    }

    let { brandName, platform, environment } = args

    const prompts = []

    if (!brandName || !availableBrands.includes(brandName)) {
      prompts.push({
        type: 'list',
        name: 'brandName',
        message: 'Select the brand to run:',
        choices: availableBrands,
        default: oldBrand,
      })
    }

    if (!platform || !['android', 'ios'].includes(platform)) {
      prompts.push({
        type: 'list',
        name: 'platform',
        message: 'Select the platform:',
        choices: ['android', 'ios'],
      })
    }

    if (!environment || !['dev', 'staging', 'prd'].includes(environment)) {
      prompts.push({
        type: 'list',
        name: 'environment',
        message: 'Select the environment flavor:',
        choices: ['dev', 'staging', 'prd'],
      })
    }

    if (prompts.length > 0) {
      const answers = await inquirer.prompt(prompts)
      if (!brandName || !availableBrands.includes(brandName))
        brandName = answers.brandName
      if (!platform || !['android', 'ios'].includes(platform))
        platform = answers.platform
      if (!environment || !['dev', 'staging', 'prd'].includes(environment))
        environment = answers.environment
    }

    try {
      // Delegation 1: Apply Brand (Only if different, though apply script handles idempotency somewhat)
      // Actually apply script should always run to ensure correct env/brand state if someone switched git branches
      if (!process.env.DRY_RUN) {
        applyBrand(cwd, brandName, oldBrand)
      } else {
        console.log(
          chalk.yellow(
            `[Dry Run] Would apply brand: ${brandName} replacing ${oldBrand}`,
          ),
        )
      }

      // Delegation 2: Build & Run
      await runReactNative(cwd, platform, environment, brandName)

      console.log(
        chalk.green.bold(`\nWorkflow \`run\` completed successfully.`),
      )
    } catch (error) {
      console.error(chalk.red(`\nFatal Workflow Error: ${error.message}`))
      process.exit(1)
    }
  },
}

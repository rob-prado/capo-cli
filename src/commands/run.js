import { spawn, spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import chalk from 'chalk'
import http from 'http'
import { runWizard } from '../utils/wizard.js'
import { ensureJavaVersion } from '../utils/env-checker.js'
import { evaluateAndPrepareIOSDevice } from '../utils/ios-device-checker.js'

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
 * Installs iOS Pods.
 *
 * @param {string} cwd - The current working directory.
 */
function installPods(cwd) {
  console.log(chalk.blue(`\n[Orchestrator] Synchronizing iOS Pods...`))

  if (process.env.DRY_RUN) {
    console.log(
      chalk.yellow(
        `[Dry Run] Would execute: bundle install && bundle exec pod install`,
      ),
    )
    return
  }

  const iosPath = path.join(cwd, 'ios')

  if (!fs.existsSync(iosPath)) {
    console.warn(
      chalk.yellow(`[Orchestrator] Warning: 'ios' directory not found.`),
    )
    return
  }

  // Attempt bundle install
  spawnSync('bundle', ['install'], {
    stdio: 'inherit',
    encoding: 'utf-8',
    cwd: iosPath,
  })

  // Attempt pod install
  let result = spawnSync('bundle', ['exec', 'pod', 'install'], {
    stdio: 'inherit',
    encoding: 'utf-8',
    cwd: iosPath,
  })

  // Fallback if bundle exec pod fails
  if (result.error || result.status !== 0) {
    console.log(
      chalk.yellow(
        `[Orchestrator] 'bundle exec pod install' failed or missing. Falling back to 'pod install'...`,
      ),
    )
    result = spawnSync('pod', ['install'], {
      stdio: 'inherit',
      encoding: 'utf-8',
      cwd: iosPath,
    })

    if (result.error || result.status !== 0) {
      throw new Error(`Failed to install iOS Pods.`)
    }
  }
}

/**
 * Kills any process occupying the given port and clears Metro cache.
 *
 * @param {number} port - The port to clear.
 */
function killPortAndClearCache(port) {
  console.log(
    chalk.yellow(
      `\n[Orchestrator] Ensuring port ${port} is free and Metro cache is clear...`,
    ),
  )
  try {
    const lsof = spawnSync('lsof', ['-t', `-i:${port}`], { encoding: 'utf-8' })
    if (lsof.stdout) {
      const pids = lsof.stdout.trim().split('\n').filter(Boolean)
      if (pids.length > 0) {
        console.log(
          chalk.yellow(
            `[Orchestrator] Killing stale processes on port ${port}: ${pids.join(
              ', ',
            )}`,
          ),
        )
        for (const pid of pids) {
          spawnSync('kill', ['-9', pid])
        }
      }
    }
  } catch {
    // Ignore lsof errors
  }

  try {
    const tmpDir = process.env.TMPDIR || '/tmp'
    spawnSync('bash', ['-c', `rm -rf ${path.join(tmpDir, 'metro-*')}`])
  } catch {
    // Ignore
  }
}

/**
 * Polls the Metro bundler status endpoint until it is fully operational.
 *
 * @param {number} port - The port Metro is running on.
 * @returns {Promise<void>}
 */
function waitForMetro(port) {
  return new Promise((resolve) => {
    let retries = 0
    const interval = setInterval(() => {
      retries++
      if (retries > 60) {
        clearInterval(interval)
        console.warn(
          chalk.yellow(
            `\n[Orchestrator] Warning: Metro on port ${port} did not respond within 60 seconds. Proceeding anyway.`,
          ),
        )
        resolve()
        return
      }

      const req = http.get(`http://127.0.0.1:${port}/status`, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if (data === 'packager-status:running') {
            clearInterval(interval)
            console.log(
              chalk.green(
                `[Orchestrator] Metro on port ${port} is fully operational!`,
              ),
            )
            resolve()
          }
        })
      })

      req.on('error', () => {
        // Expected if it hasn't started yet
      })
    }, 1000)
  })
}

/**
 * Launches the Metro bundler in a new Terminal window for the specified port.
 *
 * @param {string} cwd - The current working directory.
 * @param {number} port - The port to start Metro on.
 */
function launchMetroInNewWindow(cwd, port) {
  console.log(
    chalk.magenta(
      `\n[Orchestrator] Launching Metro Bundler on port ${port} in a new terminal window...`,
    ),
  )

  if (process.env.DRY_RUN) {
    console.log(
      chalk.yellow(
        `[Dry Run] Would launch Metro in new window on port ${port}`,
      ),
    )
    return
  }

  const safeCwd = cwd.replace(/"/g, '\\"')
  const command = `cd \\"${safeCwd}\\" && export RCT_METRO_PORT=${port} && npx react-native start --port=${port} --reset-cache`
  const appleScript = `
    tell application "Terminal"
      do script "${command}"
      activate
    end tell
  `

  try {
    const res = spawnSync('osascript', ['-e', appleScript])
    if (res.status !== 0) {
      console.warn(
        chalk.yellow(
          `[Orchestrator] Warning: Failed to open new terminal window. AppleScript error: ${res.stderr ? res.stderr.toString().trim() : 'Unknown'}`,
        ),
      )
    }
  } catch {
    console.warn(
      chalk.yellow(
        `[Orchestrator] Warning: Failed to execute osascript automatically.`,
      ),
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
 * @param {number} [port] - Optional specific Metro port to run on.
 * @param {boolean} [inNewWindow] - Whether to launch in a new terminal window.
 */
function runReactNative(
  cwd,
  platform,
  environment,
  brandName,
  port,
  inNewWindow = false,
) {
  const portDisplay = port ? ` on Port ${port}` : ''
  console.log(
    chalk.blue(
      `\n[Orchestrator] Running React Native on ${platform.toUpperCase()} (${environment.toUpperCase()})${portDisplay}...`,
    ),
  )

  let command = 'npx'
  let args = ['@react-native-community/cli']

  if (platform === 'android') {
    args.push('run-android')
    args.push(`--mode=${environment}Debug`)
    if (environment !== 'prd') {
      args.push(`--appIdSuffix=${environment}`)
    }
    args.push('--no-packager')
    if (port) args.push(`--port=${port}`)
  } else if (platform === 'ios') {
    args.push('run-ios')
    // Map environment to scheme (Assuming Dev and Prod are the standard generated schemes)
    const schemeSuffix = environment === 'dev' ? 'Dev' : 'Prod'
    args.push(`--scheme=${brandName}${schemeSuffix}`)
    args.push('--no-packager')
    if (port) {
      args.push(`--port=${port}`)
      // Force Xcode build phases to recognize the dynamic port
      const xcodeEnvLocalPath = path.join(cwd, 'ios', '.xcode.env.local')
      fs.writeFileSync(
        xcodeEnvLocalPath,
        `export RCT_METRO_PORT=${port}\n`,
        'utf8',
      )

      // Force iOS Swift AppDelegate to accept the dynamic port natively, bypassing C++ caching limitations
      const appDelegatePath = path.join(
        cwd,
        'ios',
        brandName,
        'AppDelegate.swift',
      )
      if (fs.existsSync(appDelegatePath)) {
        let content = fs.readFileSync(appDelegatePath, 'utf8')

        // Sanitize: Revert to default if already patched in a previous run (with or without ?)
        content = content.replace(
          /let provider = RCTBundleURLProvider\.sharedSettings\(\)\n\s+provider\?\.jsLocation = "127\.0\.0\.1:\d+"\n\s+return provider\?\.jsBundleURL\(forBundleRoot: "index"\)/g,
          'RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")',
        )
        content = content.replace(
          /let provider = RCTBundleURLProvider\.sharedSettings\(\)\n\s+provider\.jsLocation = "127\.0\.0\.1:\d+"\n\s+return provider\.jsBundleURL\(forBundleRoot: "index"\)/g,
          'RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")',
        )

        // Inject if port is non-standard
        if (port !== 8081) {
          const target =
            'RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")'
          const replacement = `let provider = RCTBundleURLProvider.sharedSettings()\n    provider.jsLocation = "127.0.0.1:${port}"\n    return provider.jsBundleURL(forBundleRoot: "index")`
          content = content.replace(target, replacement)
        }

        fs.writeFileSync(appDelegatePath, content, 'utf8')
      }
    }
  }

  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env }

    // Pass dynamic Metro port via environment to bypass standard caching mechanisms
    if (port) {
      childEnv.RCT_METRO_PORT = port.toString()
    }

    if (inNewWindow) {
      const safeCwd = cwd.replace(/"/g, '\\"')
      let envVars = ''
      if (port) envVars += `export RCT_METRO_PORT=${port} && `
      const fullCommand = `cd \\"${safeCwd}\\" && ${envVars}${command} ${args.join(' ')}`
      const appleScript = `
        tell application "Terminal"
          do script "${fullCommand}"
        end tell
      `
      spawnSync('osascript', ['-e', appleScript])
      return resolve()
    }

    // DRY-RUN MOCK INJECTION: If DRY_RUN env is set, just print the command
    if (process.env.DRY_RUN) {
      console.log(
        chalk.yellow(`[Dry Run] Would execute: ${command} ${args.join(' ')}`),
      )
      return resolve()
    }

    const child = spawn(command, args, { cwd, env: childEnv })
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

/**
 * Wraps the runReactNative function with a self-healing retry loop.
 *
 * @param {string} cwd - The current working directory.
 * @param {string} platform - 'android' or 'ios'.
 * @param {string} environment - 'dev', 'staging', or 'prd'.
 * @param {string} brandName - The active brand name.
 * @param {number} [port] - Optional specific Metro port to run on.
 * @param {boolean} [inNewWindow] - Whether to launch in a new terminal window.
 */
async function runReactNativeWithRetry(
  cwd,
  platform,
  environment,
  brandName,
  port,
  inNewWindow = false,
) {
  let attempt = 1
  while (attempt <= 3) {
    try {
      if (attempt > 1) {
        console.log(
          chalk.blue(
            `\n[Orchestrator] Retrying React Native execution on ${platform.toUpperCase()} (Attempt ${attempt}/3)...`,
          ),
        )
      }
      await runReactNative(
        cwd,
        platform,
        environment,
        brandName,
        port,
        inNewWindow,
      )
      return // Success
    } catch (error) {
      if (attempt === 1) {
        let skipClean = false
        if (platform === 'ios') {
          const envPrepared = await evaluateAndPrepareIOSDevice()
          if (envPrepared) {
            console.warn(
              chalk.yellow(
                `\n[Self-Healing] iOS environment was missing. Skipping cache clean for this retry.`,
              ),
            )
            skipClean = true
          }
        }

        if (!skipClean) {
          console.warn(
            chalk.yellow(
              `\n[Self-Healing] Warning: ${platform.toUpperCase()} build failed. Triggering First Fallback (Clean Caches).`,
            ),
          )
          const scriptPath = path.resolve(
            __dirname,
            '../../scripts/core/clean-build-env.sh',
          )
          spawnSync('bash', [scriptPath, platform], {
            stdio: 'inherit',
            encoding: 'utf-8',
          })
        }
      } else if (attempt === 2) {
        console.warn(
          chalk.yellow(
            `\n[Self-Healing] Warning: ${platform.toUpperCase()} build failed again. Triggering Second Fallback (Clean Caches & Sync Dependencies).`,
          ),
        )
        const scriptPath = path.resolve(
          __dirname,
          '../../scripts/core/clean-build-env.sh',
        )
        spawnSync('bash', [scriptPath, platform], {
          stdio: 'inherit',
          encoding: 'utf-8',
        })

        console.log(
          chalk.blue(`\n[Orchestrator] Synchronizing Node dependencies...`),
        )
        if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
          spawnSync('yarn', ['install'], {
            cwd,
            stdio: 'inherit',
            encoding: 'utf-8',
          })
        } else {
          spawnSync('npm', ['install'], {
            cwd,
            stdio: 'inherit',
            encoding: 'utf-8',
          })
        }

        if (platform === 'ios') {
          installPods(cwd)
        }
      } else {
        console.error(
          chalk.red(
            `\n[Self-Healing] Fatal: ${platform.toUpperCase()} build failed on Attempt 3. Outputting raw error.`,
          ),
        )
        console.error(error)
        throw error // Final Failure
      }
      attempt++
    }
  }
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

    if (!platform || !['android', 'ios', 'both'].includes(platform)) {
      prompts.push({
        type: 'list',
        name: 'platform',
        message: 'Select the platform:',
        choices: ['android', 'ios', 'both'],
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
      const answers = await runWizard(prompts)
      if (!answers) return

      if (!brandName || !availableBrands.includes(brandName))
        brandName = answers.brandName
      if (!platform || !['android', 'ios', 'both'].includes(platform))
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

      // Ensure Pods are installed for iOS if missing or brand changed
      if (platform === 'ios' || platform === 'both') {
        const targetSupportPath = path.join(
          cwd,
          'ios',
          'Pods',
          'Target Support Files',
          `Pods-${brandName}`,
        )
        const podsExistForBrand = fs.existsSync(targetSupportPath)

        if (!podsExistForBrand || brandName !== oldBrand) {
          installPods(cwd)
        } else {
          console.log(
            chalk.blue(
              `\n[Orchestrator] iOS Pods exist and are synced for brand '${brandName}'. Skipping pod install.`,
            ),
          )
        }
      }

      // Ensure Java version is active before triggering any Android builds
      if (platform === 'android' || platform === 'both') {
        try {
          await ensureJavaVersion()
        } catch (error) {
          console.error(error.message)
          process.exit(1)
        }
      }

      // Delegation 2: Build & Run
      if (platform === 'both') {
        console.log(
          chalk.magenta(
            `\n[Orchestrator] Launching both Android (Port 8081) and iOS (Port 8082) in parallel...`,
          ),
        )
        killPortAndClearCache(8081)
        killPortAndClearCache(8082)

        launchMetroInNewWindow(cwd, 8081)
        launchMetroInNewWindow(cwd, 8082)

        console.log(
          chalk.magenta(
            `\n[Orchestrator] Waiting for Metro instances to initialize...`,
          ),
        )
        await Promise.all([waitForMetro(8081), waitForMetro(8082)])

        await Promise.all([
          runReactNativeWithRetry(
            cwd,
            'android',
            environment,
            brandName,
            8081,
            true,
          ),
          runReactNativeWithRetry(
            cwd,
            'ios',
            environment,
            brandName,
            8082,
            true,
          ),
        ])
      } else {
        const port = platform === 'ios' ? 8082 : 8081
        killPortAndClearCache(port)

        launchMetroInNewWindow(cwd, port)
        console.log(
          chalk.magenta(`\n[Orchestrator] Waiting for Metro to initialize...`),
        )
        await waitForMetro(port)

        await runReactNativeWithRetry(
          cwd,
          platform,
          environment,
          brandName,
          port,
        )
      }

      console.log(
        chalk.green.bold(`\nWorkflow \`run\` completed successfully.`),
      )
    } catch (error) {
      console.error(chalk.red(`\nFatal Workflow Error: ${error.message}`))
      process.exit(1)
    }
  },
}

import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import chalk from 'chalk'

/**
 * Evaluates if an iOS physical device is connected and prepared for development.
 * If not, checks for a booted simulator.
 * If neither exists, attempts to boot a fallback iOS simulator.
 * @returns {Promise<boolean>} true if an environment was missing but successfully prepared (so we should retry without cleaning).
 */
export async function evaluateAndPrepareIOSDevice() {
  console.log(chalk.blue(`\n[Orchestrator] Evaluating iOS device state...`))

  // 1. Check physical device via devicectl
  const tmpJsonPath = path.join(os.tmpdir(), `devicectl-${Date.now()}.json`)
  const devicectl = spawnSync(
    'xcrun',
    ['devicectl', 'list', 'devices', '--json-output', tmpJsonPath],
    { encoding: 'utf8' },
  )

  if (devicectl.status === 0 && fs.existsSync(tmpJsonPath)) {
    try {
      const json = JSON.parse(fs.readFileSync(tmpJsonPath, 'utf8'))
      const devices = json.result?.devices || []
      const readyDevice = devices.find(
        (d) =>
          d.hardwareProperties?.reality === 'physical' &&
          d.deviceProperties?.ddiServicesAvailable === true &&
          d.deviceProperties?.developerModeStatus !== 'disabled',
      )
      if (readyDevice) {
        console.log(
          chalk.green(
            `[Orchestrator] Found prepared physical iOS device: ${readyDevice.hardwareProperties.marketingName}`,
          ),
        )
        fs.unlinkSync(tmpJsonPath)
        return false // Device was already ready, failure is likely cache corruption
      }
    } catch {
      // Ignore parsing errors
    }
    try {
      fs.unlinkSync(tmpJsonPath)
    } catch {}
  }

  // 2. Check for booted simulator
  const simResult = spawnSync(
    'xcrun',
    ['simctl', 'list', 'devices', 'available', '--json'],
    { encoding: 'utf8' },
  )
  if (simResult.status === 0) {
    try {
      const simJson = JSON.parse(simResult.stdout)
      let bootedSim = null
      let fallbackSim = null

      for (const runtime in simJson.devices) {
        if (!runtime.includes('iOS')) continue
        const sims = simJson.devices[runtime]
        const booted = sims.find((s) => s.state === 'Booted')
        if (booted) {
          bootedSim = booted
          break
        }
        if (!fallbackSim) {
          fallbackSim = sims.find((s) => s.name.includes('iPhone'))
        }
      }

      if (bootedSim) {
        console.log(
          chalk.green(
            `[Orchestrator] Found booted iOS Simulator: ${bootedSim.name}`,
          ),
        )
        return false // Simulator was already ready, failure is likely cache corruption
      }

      // 3. Fallback: Boot a simulator
      if (fallbackSim) {
        console.log(
          chalk.yellow(
            `[Orchestrator] No prepared physical device or booted simulator found.`,
          ),
        )
        console.log(
          chalk.magenta(
            `[Orchestrator] Booting fallback simulator: ${fallbackSim.name}...`,
          ),
        )
        spawnSync('xcrun', ['simctl', 'boot', fallbackSim.udid])
        // Give it a brief moment to initialize before returning
        await new Promise((resolve) => setTimeout(resolve, 3000))
        return true // Environment was missing, we just fixed it
      } else {
        console.warn(
          chalk.red(
            `[Orchestrator] Warning: No available iOS simulators to boot as fallback.`,
          ),
        )
      }
    } catch {
      // Ignore parsing errors
    }
  }

  return false // Couldn't prepare anything, assume cache issue
}

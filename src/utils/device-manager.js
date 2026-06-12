import { execSync } from 'child_process'
import chalk from 'chalk'
import { runWizard } from './wizard.js'

/**
 * Retrieves a list of Android devices and emulators.
 * @returns {Array} List of devices
 */
export function getAndroidDevices() {
  const devices = []
  const seenIds = new Set()

  try {
    const output = execSync('adb devices', { encoding: 'utf8' })
    const lines = output.split('\n').slice(1) // Skip "List of devices attached"
    lines.forEach((line) => {
      if (line.match(/\s+device\s*$/)) {
        const id = line.split(/\s+/)[0]
        const isEmulator = id.startsWith('emulator-')
        devices.push({
          name: id,
          id,
          type: isEmulator ? 'emulator' : 'device',
          status: 'booted',
        })
        seenIds.add(id)
      }
    })
  } catch (err) {
    // Ignore adb errors
  }

  try {
    const output = execSync('emulator -list-avds', { encoding: 'utf8' })
    const avds = output
      .split('\n')
      .filter(
        (device) =>
          device && !device.startsWith(' ') && !device.startsWith('INFO'),
      )

    avds.forEach((avd) => {
      // If we already added this emulator as running, we might still list the AVD name.
      // But for simplicity, we'll list all AVDs.
      // If run-android is passed an AVD name via --deviceId, it might not work directly.
      // React Native CLI usually expects a running device ID for --deviceId.
      // However, keeping parity with legacy where they list all emulators.
      devices.push({
        name: avd,
        id: avd,
        type: 'emulator',
        status: 'shutdown',
      })
    })
  } catch (err) {
    // Ignore emulator errors
  }

  return devices
}

/**
 * Retrieves a list of iOS simulators and physical devices.
 * @returns {Array} List of devices
 */
export function getIOSDevices() {
  const devices = []

  // 1. Get connected physical devices via xctrace
  try {
    const output = execSync('xcrun xctrace list devices', {
      encoding: 'utf8',
    }).trim()
    const devicesSection = output.split('== Simulators ==')[0]
    const lines = devicesSection.split('\n')

    lines.forEach((line) => {
      const match = line.match(/(.+?) \(([\d.]+)\) \(([\w-]+)\)/)
      // Usually "iPhone (16.4) (00008110-00123456789)"
      if (match && !line.includes('Simulator')) {
        const name = match[1].trim()
        const osVersion = match[2]
        const udid = match[3]

        // Ensure it's an iPhone/iPad
        if (name.includes('iPhone') || name.includes('iPad')) {
          devices.push({
            name: `${name} (${osVersion})`,
            id: name, // run-ios accepts name for physical devices
            udid,
            type: 'device',
            status: 'connected',
          })
        }
      }
    })
  } catch (err) {
    // Ignore xctrace errors
  }

  // 2. Get simulators via simctl
  try {
    const output = execSync('xcrun simctl list devices', { encoding: 'utf8' })
    let currentOS = null

    output.split('\n').forEach((line) => {
      const osMatch = line.match(/--\s(iOS\s[\d\.]+)\s--/)
      if (osMatch) {
        currentOS = osMatch[1]
        return
      }

      const deviceMatch = line.match(
        /^\s{4}(.+?)\s\(([\w\-]+)\)\s\((Booted|Shutdown)\)/,
      )
      if (deviceMatch && currentOS) {
        const name = deviceMatch[1].trim()
        const udid = deviceMatch[2]
        const state = deviceMatch[3]

        devices.push({
          name: `${name} (${currentOS})`,
          id: name, // run-ios --simulator="iPhone 14" expects the name
          udid,
          type: 'simulator',
          status: state.toLowerCase(),
        })
      }
    })
  } catch (err) {
    // Ignore simctl errors
  }

  return devices
}

/**
 * Prompts the user to select a device/emulator for the given platform.
 * @param {string} platform - 'android' or 'ios'
 * @returns {Promise<Object|null>} The selected device object or null if cancelled
 */
export async function promptForDevice(platform) {
  let devices = []

  if (platform === 'android') {
    devices = getAndroidDevices()
  } else if (platform === 'ios') {
    devices = getIOSDevices()
  }

  const choices = [
    { name: 'Default / Auto-detect', value: { type: 'default', id: null } },
  ]

  devices.forEach((device) => {
    let icon = '📱'
    if (device.type === 'simulator' || device.type === 'emulator') {
      icon = '💻'
    }

    let statusText = `[${device.status}]`
    if (device.status === 'booted' || device.status === 'connected') {
      statusText = chalk.green(statusText)
    } else {
      statusText = chalk.gray(statusText)
    }

    choices.push({
      name: `${icon} ${device.name} ${statusText}`,
      value: { type: device.type, id: device.id, platform },
    })
  })

  const answers = await runWizard([
    {
      type: 'list',
      name: 'selectedDevice',
      message: `Select the ${platform === 'ios' ? 'iOS' : 'Android'} device to target:`,
      choices: choices,
      pageSize: 15,
    },
  ])

  if (!answers) return null

  return answers.selectedDevice
}

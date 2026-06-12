import { execSync, spawnSync } from 'child_process'
import chalk from 'chalk'
import path from 'path'
import { fileURLToPath } from 'url'
import { runWizard } from './wizard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

  choices.push({
    name: '📡 Pair a new device via Wi-Fi',
    value: { type: 'wifi-pairing', platform },
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

  if (answers.selectedDevice.type === 'wifi-pairing') {
    return await handleWifiPairing(platform)
  }

  return answers.selectedDevice
}

/**
 * Handles Wi-Fi pairing logic natively.
 * @param {string} platform - 'android' or 'ios'
 * @returns {Promise<Object|null>} The newly paired device or null
 */
export async function handleWifiPairing(platform) {
  if (platform === 'android') {
    const answers = await runWizard([
      {
        type: 'list',
        name: 'mode',
        message: 'How would you like to pair your Android device?',
        choices: [
          {
            name: 'Android 11+ Wireless Debugging (No USB required)',
            value: 'wireless',
          },
          {
            name: 'Traditional Wi-Fi Debugging (Requires USB initially)',
            value: 'tcpip',
          },
        ],
      },
    ])
    if (!answers) return null

    if (answers.mode === 'wireless') {
      const pairAnswers = await runWizard([
        {
          type: 'list',
          name: 'alreadyPaired',
          message: 'Is your device already paired with this computer?',
          choices: [
            { name: 'Yes', value: true },
            { name: 'No', value: false },
          ],
        },
      ])
      if (!pairAnswers) return null

      if (pairAnswers.alreadyPaired) {
        console.log(
          chalk.cyan(
            "\n📱 Look at the main 'Wireless Debugging' screen and find the 'IP address & Port'.",
          ),
        )
        const inputs = await runWizard([
          {
            type: 'input',
            name: 'connectIpPort',
            message: 'Enter the Connection IP:Port:',
            validate: (i) =>
              /^\d+\.\d+\.\d+\.\d+:\d+$/.test(i) || 'Invalid format',
          },
        ])
        if (!inputs) return null

        try {
          spawnSync('adb', ['start-server'], { encoding: 'utf8' })
          const result = spawnSync('adb', ['connect', inputs.connectIpPort], {
            encoding: 'utf8',
          })
          const output = (result.stdout || '') + (result.stderr || '')
          if (
            result.status !== 0 ||
            /failed|cannot connect|offline|error/i.test(output)
          ) {
            console.log(chalk.red(`\n❌ Connection failed: ${output.trim()}`))
            console.log(
              chalk.yellow(
                'Please verify the IP:Port and ensure the device screen is awake.',
              ),
            )
            return null
          }
          console.log(chalk.green('\n✅ Connected successfully.'))
          return { type: 'device', id: inputs.connectIpPort, platform }
        } catch (e) {
          console.log(chalk.red('\n❌ Connection error: ' + e.message))
          return null
        }
      }

      console.log(chalk.cyan.bold('\n📱 Android 11+ Wireless Debugging Guide:'))
      console.log(
        chalk.cyan(
          '1. Ensure both your computer and Android device are on the SAME Wi-Fi network.',
        ),
      )
      console.log(
        chalk.cyan(
          '2. On your device, go to Settings > Developer Options > Wireless Debugging and turn it ON.',
        ),
      )
      console.log(chalk.cyan("3. Tap 'Pair device with pairing code'."))

      const pairInputs = await runWizard([
        {
          type: 'input',
          name: 'pairingIpPort',
          message: 'Enter the Pairing IP:Port (from the popup):',
          validate: (i) =>
            /^\d+\.\d+\.\d+\.\d+:\d+$/.test(i) || 'Invalid format',
        },
        {
          type: 'input',
          name: 'pairingCode',
          message: 'Enter the 6-digit Pairing Code:',
          validate: (i) => /^\d{6}$/.test(i) || 'Code must be 6 digits',
        },
      ])
      if (!pairInputs) return null

      try {
        spawnSync('adb', ['start-server'], { encoding: 'utf8' })
        const pairResult = spawnSync(
          'adb',
          ['pair', pairInputs.pairingIpPort, pairInputs.pairingCode],
          { encoding: 'utf8' },
        )
        const pairOutput = (pairResult.stdout || '') + (pairResult.stderr || '')
        if (pairResult.status !== 0 || /failed|error/i.test(pairOutput)) {
          console.log(
            chalk.red(
              `\n❌ Pairing failed. Output:\n${pairOutput.trim()}\nPlease check the IP and code and try again.`,
            ),
          )
          return null
        }
      } catch (e) {
        console.log(chalk.red('\n❌ Pairing error: ' + e.message))
        return null
      }

      console.log(
        chalk.green(
          '\n✅ Pairing successful. The popup on your device will close.',
        ),
      )
      console.log(
        chalk.cyan("\n📱 Now, look at the MAIN 'Wireless Debugging' screen."),
      )

      const connectInputs = await runWizard([
        {
          type: 'input',
          name: 'connectIpPort',
          message: 'Enter the NEW Connection IP:Port:',
          validate: (i) =>
            /^\d+\.\d+\.\d+\.\d+:\d+$/.test(i) || 'Invalid format',
        },
      ])
      if (!connectInputs) return null

      try {
        const connectResult = spawnSync(
          'adb',
          ['connect', connectInputs.connectIpPort],
          { encoding: 'utf8' },
        )
        const connectOutput =
          (connectResult.stdout || '') + (connectResult.stderr || '')
        if (
          connectResult.status !== 0 ||
          /failed|cannot connect|offline|error/i.test(connectOutput)
        ) {
          console.log(
            chalk.red(`\n❌ Connection failed: ${connectOutput.trim()}`),
          )
          console.log(
            chalk.yellow(
              'Please verify the IP:Port and ensure the device screen is awake.',
            ),
          )
          return null
        }
      } catch (e) {
        console.log(chalk.red('\n❌ Connection error: ' + e.message))
        return null
      }

      console.log(chalk.green('\n✅ Connected successfully.'))
      return { type: 'device', id: connectInputs.connectIpPort, platform }
    } else {
      const inputs = await runWizard([
        {
          type: 'input',
          name: 'deviceIp',
          message: 'Enter the IP address of the connected USB device:',
          validate: (i) =>
            /^\d+\.\d+\.\d+\.\d+$/.test(i) || 'Invalid IP format',
        },
      ])
      if (!inputs) return null

      const scriptPath = path.resolve(
        __dirname,
        '../../scripts/core/pair-android-wifi.sh',
      )
      const result = spawnSync('bash', [scriptPath, 'tcpip', inputs.deviceIp], {
        stdio: 'inherit',
      })
      if (result.status !== 0) return null

      return { type: 'device', id: `${inputs.deviceIp}:5555`, platform }
    }
  } else if (platform === 'ios') {
    const scriptPath = path.resolve(
      __dirname,
      '../../scripts/core/pair-ios-wifi.sh',
    )
    const result = spawnSync('bash', [scriptPath], { stdio: 'inherit' })
    if (result.status !== 0) return null

    console.log(
      chalk.blue(
        '\n[Orchestrator] Scanning for Wi-Fi devices (this may take a few seconds)...',
      ),
    )

    // Wait a few seconds for Xcode to list the device
    execSync('sleep 5')
    const devices = getIOSDevices()
    const wifiDevice = devices.find((d) => d.status === 'connected')

    if (wifiDevice) {
      console.log(
        chalk.green(`[Orchestrator] Found device: ${wifiDevice.name}`),
      )
      return { type: 'device', id: wifiDevice.id, platform }
    } else {
      console.log(
        chalk.yellow(
          '[Orchestrator] No new Wi-Fi devices detected automatically. Check Xcode.',
        ),
      )
      return { type: 'default', id: null }
    }
  }

  return null
}

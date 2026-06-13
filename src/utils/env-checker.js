import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Ensures that the active Java environment matches the version specified in the project's .java-version file.
 * Throws a custom error if Java is missing or the version is incompatible.
 */
export async function ensureJavaVersion() {
  const javaVersionPath = path.resolve(__dirname, '../../.capo-java-version')
  let requiredVersion = 17 // Fallback

  if (fs.existsSync(javaVersionPath)) {
    const content = fs.readFileSync(javaVersionPath, 'utf-8').trim()
    const parsed = parseInt(content, 10)
    if (!isNaN(parsed)) {
      requiredVersion = parsed
    }
  }

  // `javac` is typically the most reliable way to check the JDK version.
  const result = spawnSync('javac', ['-version'], { encoding: 'utf-8' })

  if (result.error || result.status !== 0) {
    throw new Error(
      chalk.red(
        `\n❌ Incompatible Java Version detected. Capo CLI strictly requires Java ${requiredVersion} for Android builds.\n` +
          `Java could not be found or failed to execute. Please set your environment (e.g., run 'mise use java@${requiredVersion}') and try again.`,
      ),
    )
  }

  // javac -version outputs to stdout or stderr depending on the exact version.
  const output = ((result.stdout || '') + (result.stderr || '')).trim()

  // Match versions like "javac 17.0.x" or "17."
  const versionMatch =
    output.match(/javac\s+(\d+)\./) || output.match(/(\d+)\./)

  if (!versionMatch) {
    throw new Error(
      chalk.red(
        `\n❌ Incompatible Java Version detected. Capo CLI strictly requires Java ${requiredVersion} for Android builds.\n` +
          `Could not parse Java version from: ${output}. Please set your environment (e.g., run 'mise use java@${requiredVersion}') and try again.`,
      ),
    )
  }

  const majorVersion = parseInt(versionMatch[1], 10)

  if (majorVersion !== requiredVersion) {
    throw new Error(
      chalk.red(
        `\n❌ Incompatible Java Version detected. Capo CLI strictly requires Java ${requiredVersion} for Android builds.\n` +
          `You are currently running Java ${majorVersion}. Please set your environment (e.g., run 'mise use java@${requiredVersion}') and try again.`,
      ),
    )
  }
}

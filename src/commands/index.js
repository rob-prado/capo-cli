import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Dynamically loads all command modules from the src/commands directory.
 * Each module must default export the standard interface:
 * { name: string, description: string, requireInit: boolean, run: async function }
 *
 * @returns {Promise<Array<Object>>} List of registered commands.
 */
export async function loadCommands() {
  const files = fs.readdirSync(__dirname)
  const commands = []

  for (const file of files) {
    // Skip this index file and non-js files
    if (file === 'index.js' || !file.endsWith('.js')) {
      continue
    }

    const filePath = path.join(__dirname, file)
    // Convert absolute path to file URL for dynamic import on Windows/Unix
    const fileUrl = pathToFileURL(filePath).href
    const module = await import(fileUrl)

    if (
      module.default &&
      module.default.name &&
      typeof module.default.run === 'function'
    ) {
      commands.push(module.default)
    }
  }

  return commands
}

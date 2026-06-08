import fs from 'fs'
import path from 'path'

/**
 * Validates the project name.
 * Constraint: Must be alphanumeric with underscores only.
 *
 * @param {string} name - The project name to validate.
 * @returns {boolean|string} True if valid, error message otherwise.
 */
export function isValidProjectName(name) {
  if (typeof name !== 'string' || name.length === 0)
    return 'Project name cannot be empty.'
  const regex = /^[a-zA-Z0-9_]+$/
  return regex.test(name) ? true : 'Must be alphanumeric and underscores only.'
}

/**
 * Validates the brand name.
 * Constraint: Must be alphanumeric only.
 *
 * @param {string} brand - The brand name to validate.
 * @returns {boolean|string} True if valid, error message otherwise.
 */
export function isValidBrand(brand) {
  if (typeof brand !== 'string' || brand.length === 0)
    return 'Brand name cannot be empty.'
  const regex = /^[a-zA-Z0-9]+$/
  return regex.test(brand) ? true : 'Must be alphanumeric only.'
}

/**
 * Checks if the current working directory is a valid initialized Capo project.
 * It verifies the existence of key files/directories like package.json, app.json, android/, and ios/.
 *
 * @param {string} [cwd=process.cwd()] - The directory to check.
 * @returns {boolean} True if inside a Capo project.
 */
export function isCapoProject(cwd = process.cwd()) {
  const packageJsonPath = path.resolve(cwd, 'package.json')
  const appJsonPath = path.resolve(cwd, 'app.json')
  const androidPath = path.resolve(cwd, 'android')
  const iosPath = path.resolve(cwd, 'ios')

  return (
    fs.existsSync(packageJsonPath) &&
    fs.existsSync(appJsonPath) &&
    fs.existsSync(androidPath) &&
    fs.existsSync(iosPath)
  )
}

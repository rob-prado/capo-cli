import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { isValidProjectName, isValidBrand } from './init.js';

/**
 * Helper utility to determine if a project has already been initialized
 * in the current working directory.
 * 
 * @returns {boolean} True if package.json exists in CWD, indicating initialization.
 */
function isProjectInitialized() {
    return fs.existsSync(path.resolve(process.cwd(), 'package.json'));
}

/**
 * Prompt configuration for defining a new project name.
 * Expects an alphanumeric string with underscores.
 * 
 * @type {import('inquirer').Question}
 */
export const projectNameQuestion = {
    type: 'input',
    name: 'projectName',
    message: chalk.blue('Enter the new project name:'),
    validate: isValidProjectName
};

/**
 * Prompt configuration for defining the initial brand name.
 * Expects an alphanumeric string.
 * 
 * @type {import('inquirer').Question}
 */
export const initialBrandQuestion = {
    type: 'input',
    name: 'initialBrand',
    message: chalk.blue('Enter the initial brand name:'),
    validate: isValidBrand
};

/**
 * Prompt configuration for selecting the main CLI action.
 * Dynamically updates available choices based on the initialization state
 * of the current working directory.
 * 
 * @type {import('inquirer').Question}
 */
export const actionQuestion = {
    type: 'list',
    name: 'action',
    message: chalk.blue('What would you like to do?'),
    choices: () => {
        const initialized = isProjectInitialized();
        
        if (initialized) {
            return [
                { name: chalk.green('Create a new Brand'), value: 'create-brand' },
                { name: chalk.green('Run the project'), value: 'run' },
                { name: chalk.green('Pack for distribution'), value: 'pack' },
                { name: chalk.green('Release to production'), value: 'release' }
            ];
        } else {
            return [
                { name: chalk.green('Initialize a new project'), value: 'init' }
            ];
        }
    }
};

/**
 * Master questions object exporting all prompt configurations 
 * for the CLI orchestrators.
 */
export const questions = {
    projectName: projectNameQuestion,
    initialBrand: initialBrandQuestion,
    action: actionQuestion
};

import inquirer from 'inquirer'
import chalk from 'chalk'

/**
 * Runs an array of Inquirer prompts as a Wizard, allowing Back/Quit navigation.
 *
 * @param {Array} prompts - Array of Inquirer prompt objects.
 * @param {Object} initialAnswers - Optional initial answers.
 * @returns {Promise<Object>} The final accumulated answers object.
 */
export async function runWizard(prompts, initialAnswers = {}) {
  let currentStep = 0
  const answers = { ...initialAnswers }

  while (currentStep >= 0 && currentStep < prompts.length) {
    const originalPrompt = prompts[currentStep]
    const prompt = { ...originalPrompt }

    // Check when() condition
    if (typeof prompt.when === 'function') {
      const shouldRun = await prompt.when(answers)
      if (!shouldRun) {
        currentStep++
        continue
      }
    } else if (prompt.when === false) {
      currentStep++
      continue
    }

    // Pre-fill default from previous answers if going back
    if (answers[prompt.name] !== undefined) {
      prompt.default = answers[prompt.name]
    } else if (typeof originalPrompt.default === 'function') {
      prompt.default = await originalPrompt.default(answers)
    }

    // Inject Back and Quit options into lists
    if (['list', 'rawlist', 'checkbox'].includes(prompt.type)) {
      let originalChoices = []
      if (typeof prompt.choices === 'function') {
        originalChoices = await prompt.choices(answers)
      } else {
        originalChoices = prompt.choices
      }

      const choices = Array.isArray(originalChoices)
        ? [...originalChoices]
        : originalChoices

      choices.push(new inquirer.Separator())
      choices.push({ name: chalk.yellow('🔙 Back'), value: '__BACK__' })
      choices.push({ name: chalk.red('🚪 Quit'), value: '__QUIT__' })

      prompt.choices = choices
    } else if (prompt.type === 'input') {
      const instructions = " (Type 'back' to go back, 'quit' to quit)"
      prompt.message = `${prompt.message}${chalk.dim(instructions)}`

      const originalValidate = prompt.validate
      prompt.validate = async (input, hash) => {
        const lowerInput = String(input).trim().toLowerCase()
        if (
          lowerInput === 'quit' ||
          lowerInput === '<quit>' ||
          lowerInput === 'back' ||
          lowerInput === '<back>'
        )
          return true
        if (originalValidate) {
          return originalValidate(input, hash)
        }
        return true
      }
    }

    const stepAnswer = await inquirer.prompt([prompt])
    const val = stepAnswer[prompt.name]
    const lowerVal = String(val).trim().toLowerCase()

    if (val === '__QUIT__' || lowerVal === 'quit' || lowerVal === '<quit>') {
      console.log(chalk.cyan('\nGoodbye!'))
      process.exit(0)
    }

    if (val === '__BACK__' || lowerVal === 'back' || lowerVal === '<back>') {
      // Find the previous visible step
      currentStep--
      while (currentStep >= 0) {
        const prevPrompt = prompts[currentStep]
        if (typeof prevPrompt.when === 'function') {
          const shouldRun = await prevPrompt.when(answers)
          if (shouldRun) break
        } else if (prevPrompt.when !== false) {
          break
        }
        currentStep--
      }

      // If we've backed out of the very first step, abort the wizard
      if (currentStep < 0) {
        return null
      }
      continue
    }

    answers[prompt.name] = val
    currentStep++
  }

  return answers
}

import chalk from 'chalk'

export default {
  name: 'run',
  description: 'Run the project',
  requireInit: true,
  run: async (args) => {
    console.log(
      chalk.yellow(
        `\nFeature 'run' is under construction in the Agent-First architecture.`,
      ),
    )
  },
}

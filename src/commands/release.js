import chalk from 'chalk'

export default {
  name: 'release',
  description: 'Release to production',
  requireInit: true,
  run: async (args) => {
    console.log(
      chalk.yellow(
        `\nFeature 'release' is under construction in the Agent-First architecture.`,
      ),
    )
  },
}

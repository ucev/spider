const chalk = require('chalk')

module.exports = {
  error: function (str) {
    console.log(chalk.bgRed.white(str))
  },
  succ: function (str) {
    console.log(chalk.bgGreen.yellow(str))
  }
}

'use strict'

const { addSyncTask } = require('./ws_pool')

module.exports = async (symbol, tf) => {
  addSyncTask(symbol, tf)
}

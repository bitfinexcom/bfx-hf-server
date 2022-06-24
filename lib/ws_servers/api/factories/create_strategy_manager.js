const StrategyManager = require('../handlers/strategy/strategy_manager')

/**
 * @param {APIWSServer} server
 * @param {FilteredWebSocket} ws
 * @returns {StrategyManager}
 */
module.exports = (server, ws) => {
  const { wsURL, restURL, strategyExecutionDB } = server
  const bcast = { ws }

  return new StrategyManager(
    {
      dms: false,
      wsURL,
      restURL
    },
    bcast,
    strategyExecutionDB
  )
}

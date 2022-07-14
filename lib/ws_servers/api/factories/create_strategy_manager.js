const StrategyManager = require('../handlers/strategy/strategy_manager')
const send = require('../../../util/ws/send')

/**
 * @param {APIWSServer} server
 * @param {FilteredWebSocket} ws
 * @returns {StrategyManager}
 */
module.exports = (server, ws) => {
  const { wsURL, restURL, strategyExecutionDB } = server
  const bcast = send.bind(null, ws)

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

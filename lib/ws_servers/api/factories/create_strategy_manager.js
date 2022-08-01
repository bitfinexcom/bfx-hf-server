const StrategyManager = require('../handlers/strategy/strategy_manager')
const send = require('../../../util/ws/send')

/**
 * @param {APIWSServer} server
 * @param {FilteredWebSocket} ws
 * @param {string} scope
 * @param {function} sendDataToMetricsServer
 * @returns {StrategyManager}
 */
module.exports = (server, ws, scope, sendDataToMetricsServer) => {
  const { wsURL, restURL, strategyExecutionDB } = server
  const bcast = send.bind(null, ws)

  return new StrategyManager(
    {
      dms: false,
      wsURL,
      restURL,
      scope
    },
    bcast,
    strategyExecutionDB,
    sendDataToMetricsServer
  )
}

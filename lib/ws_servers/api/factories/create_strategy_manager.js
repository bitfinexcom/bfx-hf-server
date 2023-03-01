const StrategyManager = require('../handlers/strategy/strategy_manager')
const send = require('../../../util/ws/send')

/**
 * @param {APIWSServer} server
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @param {string} scope
 * @param {Object} settings
 * @param {function} sendDataToMetricsServer
 * @returns {StrategyManager}
 */
module.exports = (server, session, ws, scope, settings, sendDataToMetricsServer) => {
  const { wsURL, restURL, strategyExecutionDB } = server
  const { packetWDDelay } = settings

  const { apiKey, apiSecret } = session.getCredentials()
  const bcast = send.bind(null, ws)

  return new StrategyManager(
    {
      dms: false,
      wsURL,
      restURL,
      scope,
      apiKey,
      apiSecret,
      packetWDDelay
    },
    bcast,
    strategyExecutionDB,
    sendDataToMetricsServer
  )
}

const StrategyManager = require('../handlers/strategy/strategy_manager')
const send = require('../../../util/ws/send')
const { WD_PACKET_DELAY } = require('../../../constants')

/**
 * @param {APIWSServer} server
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @param {string} scope
 * @param {function} sendDataToMetricsServer
 * @returns {StrategyManager}
 */
module.exports = async (server, session, ws, scope, sendDataToMetricsServer) => {
  const { wsURL, restURL, strategyExecutionDB } = server
  const { apiKey, apiSecret } = session.getCredentials()
  const bcast = send.bind(null, ws)

  const { packetWDDelay = WD_PACKET_DELAY } = await server.getUserSettings()

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

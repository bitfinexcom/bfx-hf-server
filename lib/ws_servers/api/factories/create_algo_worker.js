const AlgoWorker = require('../algos/algo_worker')
const send = require('../../../util/ws/send')
const { WD_PACKET_DELAY } = require('../../../constants')

/**
 * @param {APIWSServer} server
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @returns {Promise<AlgoWorker>}
 */
module.exports = async (server, session, ws) => {
  const {
    tracerDir,
    wsURL,
    restURL,
    algos,
    algoDB,
    logAlgoOpts,
    marketData
  } = server
  const { mode } = session
  const bcast = send.bind(null, ws)
  const { affiliateCode, packetWDDelay = WD_PACKET_DELAY } = await server.getUserSettings()

  return new AlgoWorker(
    {
      dms: false,
      affiliateCode,
      wsURL,
      restURL,
      mode,
      signalTracerOpts: {
        enabled: true,
        dir: tracerDir
      },
      packetWDDelay
    },
    algos,
    bcast,
    algoDB,
    logAlgoOpts,
    marketData
  )
}

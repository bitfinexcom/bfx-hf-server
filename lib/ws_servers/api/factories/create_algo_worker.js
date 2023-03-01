const AlgoWorker = require('../algos/algo_worker')
const send = require('../../../util/ws/send')

/**
 * @param {APIWSServer} server
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @param {Object} settings
 * @returns {AlgoWorker}
 */
module.exports = async (server, session, ws, settings) => {
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
  const { affiliateCode, packetWDDelay } = settings
  const bcast = send.bind(null, ws)

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

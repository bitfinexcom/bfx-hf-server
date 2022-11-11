const AlgoWorker = require('../algos/algo_worker')
const send = require('../../../util/ws/send')

/**
 * @param {APIWSServer} server
 * @param {FilteredWebSocket} ws
 * @param {String} mode
 * @returns {Promise<AlgoWorker>}
 */
module.exports = async (server, ws, mode) => {
  const {
    tracerDir,
    wsURL,
    restURL,
    algos,
    algoDB,
    logAlgoOpts,
    marketData
  } = server
  const bcast = send.bind(null, ws)
  const { affiliateCode } = await server.getUserSettings()

  return new AlgoWorker(
    {
      dms: false,
      affiliateCode,
      wsURL,
      restURL,
      signalTracerOpts: {
        enabled: true,
        dir: tracerDir
      }
    },
    algos,
    bcast,
    algoDB,
    logAlgoOpts,
    marketData,
    mode
  )
}

const send = require('../../../util/ws/send')

module.exports = async (server, session) => {
  const tasks = []

  for (const { algoWorker, strategyManager } of Object.values(session.services)) {
    if (strategyManager) {
      for (const { strategyMapKey } of strategyManager.getActiveStrategies()) {
        tasks.push(
          strategyManager.close(strategyMapKey)
        )
      }
    }

    if (algoWorker) {
      for (const { state: { gid } } of algoWorker.getActiveAlgos()) {
        tasks.push(
          algoWorker.cancelOrder(gid)
        )
      }
    }
  }

  const r = await Promise.allSettled(tasks)

  console.log(r)

  send(session, ['app.safe_close', true])
}

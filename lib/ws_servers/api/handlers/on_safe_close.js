const send = require('../../../util/ws/send')

module.exports = async (server, session) => {
  const tasks = []

  for (const { algoWorker, strategyManager } of session.services) {
    if (strategyManager) {
      for (const { strategyMapKey } of strategyManager.getActiveStrategies()) {
        tasks.push(
          strategyManager.close(strategyMapKey)
        )
      }
    }

    if (algoWorker) {
      for (const { gid } of algoWorker.getActiveAlgos()) {
        tasks.push(
          algoWorker.cancelOrder(gid)
        )
      }
    }
  }

  await Promise.allSettled(tasks)

  send(session, [''])
}

const send = require('../../../util/ws/send')

module.exports = async (server, session) => {
  const tasks = []

  for (const { algoWorker, strategyManager } of Object.values(session.services)) {
    if (strategyManager) {
      for (const { id: strategyMapKey } of strategyManager.getActiveStrategies()) {
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

  const results = await Promise.allSettled(tasks)
  let success = true

  results.forEach(result => {
    if (result.status === 'rejected') {
      success = false
      console.error('failed to stop', result.reason)
    }
  })

  send(session, ['app.can_be_closed', success])
}

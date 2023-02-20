'use strict'

const send = require('../../../util/ws/send')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const sendError = require('../../../util/ws/send_error')
const startAlgoWorkerForMode = require('../start_algoworker_for_mode')

module.exports = async (server, session, msg) => {
  const { d, algoDB } = server
  const { AlgoOrder } = algoDB
  const [, authToken, payload] = msg

  const validRequest = validateParams(session, {
    authToken: { type: 'string', v: authToken },
    payload: { type: 'object', v: payload }
  })

  if (!validRequest) {
    d('invalid request: selected_algo:resume_remove')
    return
  }

  if (!isAuthorized(session, authToken)) {
    return sendError(session, 'Unauthorized', ['unauthorized'])
  }

  const tasks = []

  for (let [mode, { algoWorker }] of Object.entries(session.services)) {
    if (!algoWorker) {
      await startAlgoWorkerForMode(server, session, { mode, dmsScope: session.dmsScope })
      algoWorker = session.services[mode].getAlgoWorker()
    }

    if (algoWorker) {
      tasks.push(...payload[mode].remove.map(({ gid }) => algoWorker.cancelOrder(gid)))

      for (const { algoID, gid } of payload[mode].resume) {
        const instance = algoWorker.host.getAOInstance(gid)
        if (instance) {
          continue
        }

        const ao = await AlgoOrder.get({ algoID, gid })
        const { state, createdAt } = ao || {}

        if (!state || !createdAt) {
          continue
        }

        tasks.push(algoWorker.host.loadAO(algoID, gid, JSON.parse(state), createdAt))
      }
    }
  }

  const results = await Promise.allSettled(tasks)
  let success = true

  results.forEach(result => {
    if (result.status === 'rejected') {
      success = false
      console.error('failed to resume/remove', result.reason)
    }
  })

  send(session, ['algo.selected_resume_removed', success])
}

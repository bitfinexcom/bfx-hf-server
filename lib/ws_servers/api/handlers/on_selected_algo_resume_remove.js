'use strict'

const _isArray = require('lodash/isArray')
const send = require('../../../util/ws/send')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const sendError = require('../../../util/ws/send_error')
const sendAuthenticated = require('../send_authenticated')

const resumeAOs = async (server, session, algoWorker, mode, payload) => {
  const { d, algoDB } = server
  const { AlgoOrder } = algoDB

  const algoOrders = payload[mode].resume || []

  for (const { algoID, gid } of algoOrders) {
    const instance = algoWorker.host.getAOInstance(gid)
    if (instance) {
      continue
    }

    const ao = await AlgoOrder.get({ algoID, gid })
    const { state, createdAt } = ao || {}

    if (!state || !createdAt) {
      continue
    }

    const [serialized, uiData] = await algoWorker.host.loadAO(algoID, gid, JSON.parse(state), createdAt)
    const { id, name, label, args, i18n, alias } = uiData
    const { lastActive } = serialized

    d('AO loaded for user %s [%s]', 'HF_UI', gid)

    send(session, ['algo.order_loaded', gid])
    send(session, ['data.ao', 'bitfinex', mode, { id, gid, alias, name, label, args, i18n, createdAt, lastActive }])
  }
}

const removeAOs = async (server, session, algoWorker, mode, payload) => {
  const { d, algoDB } = server
  const { AlgoOrder } = algoDB

  const bfxClient = session.getClient()
  if (!bfxClient) {
    return sendError(session, 'No client open for Bitfinex', ['noClientOpenFor', { target: 'Bitfinex' }])
  }

  const removedOrders = []
  const activeOrders = await bfxClient.rest.activeOrders()

  const algoOrders = payload[mode].remove || []

  for (const { gid, algoID } of algoOrders) {
    try {
      if (activeOrders.some(order => order.gid === +gid)) {
        await bfxClient.cancelOrdersByGid(+gid)
      }
      const updated = await AlgoOrder.update({ gid, algoID }, { active: false })
      if (updated) removedOrders.push(gid)
    } catch (err) {
      sendError(session, `Error removing order: ${algoID} [${gid}]`, ['errorRemovingOrder', { algoID, gid }])
      d('error removing order %s [%s]: %s', gid, algoID, err.stack)
    }
  }

  send(session, ['algo.orders_removed', removedOrders, mode])

  d('removed selected orders %s', JSON.stringify(removedOrders))
}

const isPayloadModeEmpty = (payload, mode) => {
  if (!payload[mode]) {
    return true
  }

  const resume = payload[mode].resume
  const remove = payload[mode].remove
  if (
    (_isArray(resume) && resume.length > 0) ||
    (_isArray(remove) && remove.length > 0)
  ) {
    return false
  }

  return true
}

module.exports = async (server, session, msg) => {
  const { d } = server
  const [, authToken, payload] = msg
  const { mode: currentMode } = session
  let switchedMode = currentMode

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

  for (let [mode, { algoWorker }] of Object.entries(session.services)) {
    if (isPayloadModeEmpty(payload, mode)) {
      continue
    }

    // if algoWorker is not running, start it
    if (!algoWorker) {
      await sendAuthenticated(server, session, { mode, dmsScope: session.dmsScope })
      algoWorker = session.services[mode].algoWorker

      switchedMode = mode
    }

    if (algoWorker) {
      await removeAOs(server, session, algoWorker, mode, payload)
      await resumeAOs(server, session, algoWorker, mode, payload)
    }
  }

  if (switchedMode !== currentMode) {
    await sendAuthenticated(server, session, { mode: currentMode, dmsScope: session.dmsScope })
  }
}

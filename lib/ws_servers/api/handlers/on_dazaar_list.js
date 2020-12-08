'use strict'

const send = require('bfx-hf-server/lib/util/ws/send')
const capture = require('bfx-hf-server/lib/capture')
const sendError = require('bfx-hf-server/lib/util/ws/send_error')
const validateParams = require('bfx-hf-server/lib/util/ws/validate_params')
const { notifyInternalError } = require('bfx-hf-server/lib/util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { hfDSClients, d } = server
  const hfDS = hfDSClients['bitfinex']
  if (!hfDS) {
    return sendError(ws, `unknown exchange: ${exID}`)
  }

  if (!hfDS.isOpen()) {
    return sendError(ws, `data server not connected for ${exID}`)
  }

  try {
    await hfDS.listDazaarCores(ws, msg[1])
  } catch (e) {
    capture.exception(e)
    return notifyInternalError(ws)
  }
}
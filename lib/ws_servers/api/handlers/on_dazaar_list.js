'use strict'

const capture = require('bfx-hf-server/lib/capture')
const sendError = require('bfx-hf-server/lib/util/ws/send_error')
const { notifyInternalError } = require('bfx-hf-server/lib/util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { hfDSClients } = server
  const hfDS = hfDSClients.bitfinex

  if (!hfDS.isOpen()) {
    return sendError(ws, 'data server not connected for bitfinex')
  }

  try {
    await hfDS.listDazaarCores(ws, msg[1])
  } catch (e) {
    capture.exception(e)
    return notifyInternalError(ws)
  }
}

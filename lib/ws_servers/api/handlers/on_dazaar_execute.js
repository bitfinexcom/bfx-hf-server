'use strict'
const capture = require('../../../capture')
const sendError = require('../../../util/ws/send_error')
const { notifyInternalError } = require('../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { hfDSClients } = server
  const hfDS = hfDSClients.bitfinex

  if (!hfDS.isOpen()) {
    return sendError(ws, 'data server not connected for bitfinex')
  }

  try {
    await hfDS.execDazaar(ws, msg[1])
  } catch (e) {
    capture.exception(e)
    return notifyInternalError(ws)
  }
}

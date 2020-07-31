'use strict'

const send = require('../../../util/ws/send')
const capture = require('../../../capture')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const { notifyInternalError } = require('../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { hfDSClients } = server

  const [, [exID, from, to, symbol, tf, candles, trades, sync, strategy]] = msg
  const valid = validateParams(ws, {
    exID: { type: 'string', v: exID },
    from: { type: 'number', v: from },
    to: { type: 'number', v: to },
    symbol: { type: 'string', v: symbol },
    tf: { type: 'string', v: tf },
    candles: { type: 'bool', v: candles },
    trades: { type: 'bool', v: trades },
    sync: { type: 'bool', v: sync },
    strategy: { type: 'object', v: strategy }
  })

  if (!valid) {
    return sendError(ws, `invalid params: ${msg}`)
  }

  const hfDS = hfDSClients[exID]

  if (!hfDS) {
    return sendError(ws, `unknown exchange: ${exID}`)
  }

  if (!hfDS.isOpen()) {
    return sendError(ws, `data server not connected for ${exID}`)
  }

  try {
    const btOpts = { exID, from, to, symbol, tf, candles, trades, sync, strategy }
    send(ws, ['bt.serverside', btOpts])
    await hfDS.execBacktestServerside(ws, btOpts)
  } catch (e) {
    capture.exception(e)
    return notifyInternalError(ws)
  }
}

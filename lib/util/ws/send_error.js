'use strict'

const send = require('./send')

module.exports = (ws, msg, i18n) => {
  console.error('websocket error:', msg)
  send(ws, ['error', msg, i18n])
}

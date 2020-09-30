'use strict'

const send = require('./send')

module.exports = (ws, msg) => {
  console.error('websocket error:', msg)
  send(ws, ['error', msg])
}

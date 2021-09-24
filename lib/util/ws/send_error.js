'use strict'

const { apply } = require('../../util/i18n')
const send = require('./send')

module.exports = (ws, msg, i18n) => {
  console.error('websocket error:', msg)
  send(ws, ['error', msg, apply(i18n)])
}

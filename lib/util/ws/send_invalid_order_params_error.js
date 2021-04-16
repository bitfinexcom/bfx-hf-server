'use strict'

const send = require('./send')

module.exports = (ws, msg) => {
  console.log('invalid order form params error:', msg)
  send(ws, ['invalidOrderParams', msg])
}

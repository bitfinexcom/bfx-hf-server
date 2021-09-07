'use strict'

const notifyError = require('./error')

module.exports = (ws, error) => {
  const message = error.message && error.message.match(/ERROR:/)
    ? error.message.split('ERROR:')[1].trim()
    : error.message || error.text

  notifyError(ws, `Bitfinex error - ${message}`)
}

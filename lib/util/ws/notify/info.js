'use strict'

const { apply } = require('../../../util/i18n')
const send = require('../send')

module.exports = (ws, msg, i18n) => {
  send(ws, ['notify', 'info', msg, apply(i18n)])
}

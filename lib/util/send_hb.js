'use strict'

const { send } = require('bfx-api-node-core')

module.exports = (ws2Manager) => {
  ws2Manager.withAuthSocket((ws) => {
    send(ws, [0, 'n', null, {
      mid: Date.now(),
      type: 'ucm-hb',
      info: {}
    }])
  })
}

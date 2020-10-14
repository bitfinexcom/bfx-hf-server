'use strict'

const WSServer = require('../../ws_server')

const send = require('../../util/ws/send')
const onIdentify = require('./handlers/on_identify')
const onSubmit = require('./handlers/on_submit')
const onCancel = require('./handlers/on_cancel')
const onOpen = require('./handlers/on_open')
const onClose = require('./handlers/on_close')
const onStatus = require('./handlers/on_status')
const onReconnect = require('./handlers/on_reconnect')
const onIsOpen = require('./handlers/on_is_open')
const parseHostKey = require('./util/parse_host_key')

module.exports = class AlgoServer extends WSServer {
  constructor ({
    apiDB,
    port,
    hfLowDBPath,
    wsURL,
    restURL
  }) {
    super({
      port,
      debugName: 'algos',
      msgHandlers: {
        identify: onIdentify,
        reconnect: onReconnect,
        submit: onSubmit,
        cancel: onCancel,
        open: onOpen,
        close: onClose,
        status: onStatus,
        'is.open': onIsOpen
      }
    })

    this.wsURL = wsURL
    this.restURL = restURL
    this.apiDB = apiDB
    this.dbPath = hfLowDBPath
    this.clients = {}
    this.hosts = {}
  }

  broadcast (userID, data) {
    Object.values(this.clients).forEach((ws) => {
      if (ws.userID === userID) {
        send(ws, data)
      }
    })
  }

  onWSSConnection (ws) {
    super.onWSSConnection(ws)
    this.clients[ws.id] = ws
  }

  onWSClose (ws) {
    super.onWSClose(ws)
    delete this.clients[ws.id]
  }

  getHostsForUser (userID) {
    const hostKeys = Object.keys(this.hosts)

    return hostKeys
      .map(parseHostKey)
      .filter((key) => key.userID === userID)
      .map(({ exID }) => exID)
  }
}

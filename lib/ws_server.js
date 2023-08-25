'use strict'

const WS = require('ws')
const Debug = require('debug')
const _isArray = require('lodash/isArray')

const { v4: uuidv4 } = require('uuid')
const sendError = require('./util/ws/send_error')
const send = require('./util/ws/send')

module.exports = class WSServer {
  constructor ({ server, port, debugName, msgHandlers }) {
    this.d = Debug(`bfx:hf:server:ws-server:${debugName}`)
    this._msgHandlers = msgHandlers

    this._wss = null
    this._server = server
    this._port = port
    this._name = debugName
  }

  open () {
    if (this._wss) {
      throw new Error('already open')
    }

    if (this._port) {
      this.d('starting on port %d', this._port)
    } else {
      this.d('starting up')
    }

    this._wss = new WS.Server({
      server: this._server,
      port: this._port
    })

    this._wss.on('connection', this.onWSSConnection.bind(this))
  }

  close () {
    if (!this._wss) {
      throw new Error('already closed')
    }

    this._wss.close()
    this._wss = null
  }

  onWSSConnection (ws) {
    ws.id = uuidv4()
    ws.on('message', this.onWSMessage.bind(this, ws))
    ws.on('close', this.onWSClose.bind(this, ws))

    this.d('client %s connected', ws.id)
  }

  onWSClose (ws) {
    this.d('client %s disconnected', ws.id)
  }

  onWSMessage (ws, msgJSON) {
    let msg

    try {
      msg = JSON.parse(msgJSON)
    } catch (e) {
      return sendError(ws, 'invalid message JSON')
    }

    if (!_isArray(msg)) {
      return sendError(ws, 'message not array')
    }

    this.handleWSMessage(ws, msg).catch((e) => {
      const errMessage = e.response || e.message || JSON.stringify(e)
      sendError(ws, errMessage)
    })
  }

  async handleWSMessage (ws, msg) {
    const [type] = msg
    const handler = this._msgHandlers[type]

    if (handler) {
      try {
        await handler(this, ws, msg)
      } catch (e) {
        console.error('websocket handler failed', type, e)
        throw e
      }
    }
  }

  response (ws, request, msg) {
    const requestID = request[request.length - 1]

    send(ws, [requestID, ...msg])
  }
}

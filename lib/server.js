'use strict'

const _isFinite = require('lodash/isFinite')
const debug = require('debug')('bfx:hf:server')
const { AccumulateDistribute, TWAP, Iceberg, PingPong, AOHost } = require('bfx-hf-algo')
const AOServer = require('bfx-hf-algo-server')
const DataServer = require('bfx-hf-data-server')
const { nonce } = require('bfx-api-node-util')
const WS = require('ws')

const DEFAULT_DEFINITIONS = [AccumulateDistribute, TWAP, Iceberg, PingPong]

module.exports = class HFServer {
  constructor({
    db,
    apiKey,
    apiSecret,
    agent,
    port,
    dsPort,
    asPort,
    proxy,
    transform,
    wsURL,
    restURL,
  } = {}) {
    this._dsPort = dsPort
    this._asPort = asPort

    if (_isFinite(dsPort)) {
      debug('spawning data server on port %d', dsPort)

      this.ds = new DataServer({
        db,
        port: dsPort,
        proxy,
        transform,
        apiKey,
        apiSecret,
        agent,
        restURL,
        wsURL,
      })
    }

    if (_isFinite(asPort)) {
      debug('spawning algo server on port %d', asPort)
      this.algoHost = new AOHost({
        DEFAULT_DEFINITIONS, apiKey, apiSecret, agent, wsURL, restURL
      })

      this.as = new AOServer({
        aos: null,
        port: asPort,
        apiKey,
        apiSecret,
        agent,
        wsURL,
        restURL,
      })
      this.as.setAlgoHost(this.algoHost)
    }

    this.wssClients = {}
    this.dsProxies = {}
    this.asProxies = {}
    this.wss = new WS.Server({ port })
    this.wss.on('connection', this.onWSConnected.bind(this))

    debug('websocket API open on port %d', port)
  }

  close () {
    if (this.ds) this.ds.close()
    if (this.as) this.as.close()
    this.wss.close()

    Object.values(this.dsProxies).forEach(dsProxy => {
      dsProxy.close()
    })

    Object.values(this.asProxies).forEach(asProxy => {
      asProxy.close()
    })

    this.wssClients = {}
  }

  onWSConnected (ws) {
    debug('ws client connected')

    const clientID = nonce()

    this.wssClients[clientID] = ws

    if (this.ds) this.dsProxies[clientID] = this._openDSWSProxy(clientID)
    if (this.as) this.asProxies[clientID] = this._openASWSProxy(clientID)

    ws.on('message', this.onWSMessage.bind(this, clientID))
    ws.on('close', this.onWSDisconnected.bind(this, clientID))
  }

  onWSDisconnected (clientID) {
    debug('ws client %s disconnected', clientID)

    if (this.ds) this.dsProxies[clientID].close()
    if (this.as) this.asProxies[clientID].close()

    delete this.wssClients[clientID]
    delete this.dsProxies[clientID]
    delete this.asProxies[clientID]
  }

  onWSMessage (clientID, msgJSON) {
    debug('recv %s', msgJSON)

    let msg

    try {
      msg = JSON.parse(msgJSON)
    } catch (e) {
      debug('error parsing client message JSON: %s', e.message)
      return
    }

    const [target, payload] = msg

    if (target === 'ds' && this.ds) {
      const dsProxy = this.dsProxies[clientID]

      if (!dsProxy) {
        debug('no data server proxy available for client %s', clientID)
      }

      if (dsProxy.readyState === 1) {
        debug('proxying data server message: %j', payload)
        dsProxy.send(JSON.stringify(payload))
      }
    } else if (target === 'as' && this.as) {
      const asProxy = this.asProxies[clientID]

      if (!asProxy) {
        debug('no algo server proxy available for client %s', clientID)
      }

      if (asProxy.readyState === 1) {
        debug('proxying algo server message: %j', payload)
        asProxy.send(JSON.stringify(payload))
      }
    }
  }

  _openDSWSProxy (clientID) {
    const proxy = new WS(`ws://localhost:${this._dsPort}`)

    proxy.on('message', this.onDSWSMessage.bind(this, clientID))
    proxy.on('open', this.onDSWSOpen.bind(this, clientID))
    proxy.on('error', this.onDSWSError.bind(this, clientID))
    proxy.on('close', this.onDSWSClose.bind(this, clientID))

    return proxy
  }

  _openASWSProxy (clientID) {
    const proxy = new WS(`ws://localhost:${this._asPort}`)

    proxy.on('message', this.onASWSMessage.bind(this, clientID))
    proxy.on('open', this.onASWSOpen.bind(this, clientID))
    proxy.on('error', this.onASWSError.bind(this, clientID))
    proxy.on('close', this.onASWSClose.bind(this, clientID))

    return proxy
  }

  onDSWSMessage (clientID, msgJSON) {
    const ws = this.wssClients[clientID]

    if (!ws) {
      debug('recv data server message for unknown client ID: %s', clientID)
      return
    }

    if (ws.readyState !== 1) {
      return
    }

    let msg

    try {
      msg = JSON.parse(msgJSON)
    } catch (e) {
      debug('error parsing data server message JSON: %s', e.message)
      return
    }

    ws.send(JSON.stringify(['ds', msg]))
  }

  onDSWSOpen (clientID) {
    debug('data server proxy opened [%s]', clientID)
  }

  onDSWSError (clientID, err) {
    debug('data server proxy error: %j [%s]', err, clientID)
  }

  onDSWSClose (clientID) {
    debug('data server proxy connection closed [%s]', clientID)
  }

  onASWSMessage (clientID, msgJSON) {
    const ws = this.wssClients[clientID]

    if (!ws) {
      debug('recv algo server message for unknown client ID: %s', clientID)
      return
    }

    if (ws.readyState !== 1) {
      return
    }

    let msg

    try {
      msg = JSON.parse(msgJSON)
    } catch (e) {
      debug('error parsing algo server message JSON: %s', e.message)
      return
    }

    ws.send(JSON.stringify(['as', msg]))
  }

  onASWSOpen (clientID) {
    debug('algo server proxy opened [%s]', clientID)
  }

  onASWSError (clientID, err) {
    debug('algo server proxy error: %j [%s]', err, clientID)
  }

  onASWSClose (clientID) {
    debug('algo server proxy connection closed [%s]', clientID)
  }
}

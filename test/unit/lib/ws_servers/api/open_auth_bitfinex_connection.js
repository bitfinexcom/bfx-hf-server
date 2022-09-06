/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const proxyquire = require('proxyquire').noCallThru()
const { spy, assert, createSandbox } = require('sinon')
const { expect } = require('chai')
const EventEmitter = require('events')
const { WS_CONNECTION } = require('../../../../../lib/constants')
const transformOrder = require('../../../../../lib/exchange_clients/bitfinex/transformers/order')

describe('openAuthBitfinexConnection', () => {
  const sandbox = createSandbox()

  afterEach(() => {
    sandbox.reset()
  })

  after(() => {
    sandbox.restore()
  })

  const ws = {
    send: sandbox.stub()
  }
  const apiKey = 'api key'
  const apiSecret = 'api secret'
  const authToken = 'auth token'
  const dms = false
  const d = sandbox.stub()
  const wsURL = 'ws url'
  const restURL = 'rest url'
  const isPaper = false
  const mode = 'main'
  const args = {
    ws,
    apiKey,
    apiSecret,
    authToken,
    dms,
    d,
    wsURL,
    restURL,
    isPaper,
    mode
  }

  let onData
  const bfxClient = new EventEmitter()
  bfxClient.setAuthArgs = sandbox.stub()
  bfxClient.openWS = sandbox.stub()
  bfxClient.openSocket = sandbox.stub()
  bfxClient.getUserInfo = sandbox.stub()
  bfxClient.onData = (fn) => {
    onData = fn
  }

  const openAuthBitfinexConnection = proxyquire('ws_servers/api/open_auth_bitfinex_connection', {
    '../../exchange_clients/bitfinex': spy((args) => {
      expect(args.wsURL).to.eq(wsURL)
      expect(args.restURL).to.eq(restURL)
      return bfxClient
    })
  })

  it('creates a client', (done) => {
    const client = openAuthBitfinexConnection(args)
    client.getUserInfo.resolves({ username: 'user1' })

    client.emit('ws2:event:auth:success')
    client.emit('ws2:close')
    assert.calledWithExactly(bfxClient.setAuthArgs, {
      dms: 0, apiKey, apiSecret, authToken
    })
    assert.calledWithExactly(bfxClient.openWS, {
      apiKey,
      apiSecret,
      authToken,
      channelFilters: ['trading', 'wallet', 'notify']
    })
    assert.calledWithExactly(bfxClient.openSocket)
    assert.calledWithExactly(bfxClient.getUserInfo)

    expect(client).to.eq(bfxClient)

    setImmediate(() => {
      assert.calledWithExactly(ws.send, JSON.stringify(['data.client', 'bitfinex', mode, WS_CONNECTION.OPENED]))
      assert.calledWithExactly(ws.send, JSON.stringify(['info.username', 'main', 'user1']))
      assert.calledWithExactly(ws.send, JSON.stringify(['data.client', 'bitfinex', mode, WS_CONNECTION.CLOSED]))
      done()
    })
  })

  describe('data on main mode', () => {
    it('ws', () => {
      const msgData = [
        ['AAA', 'exchange', 8288.037842747914, null],
        ['BBB', 'exchange', 76499450.78418736, null]
      ]

      onData(['ws', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.balances', 'bitfinex', msgData]))
    })

    it('wu', () => {
      const msgData = ['AAA', 'exchange', 8288.037842747914, 8288.037842747914]

      onData(['wu', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.balance', 'bitfinex', msgData]))
    })

    it('ps', () => {
      const msgData = [['tAAA:tBBB', 'ACTIVE', -0.00126, 61062.52380952381, 0.0025, 0, 27.43842, 35.66266582339881, 66863.46357142857, 10.000000000000002, null, 148595738, null, null, null, 1, null, 7.693878, 0.7693878000000001, null]]

      onData(['ps', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.positions', 'bitfinex', msgData]))
    })

    it('pu', () => {
      const msgData = ['tAAA:tBBB', 'ACTIVE', -0.00126, 61062.52380952381, 0.0025, 0, 27.43842, 35.66266582339881, 66863.46357142857, 10.000000000000002, null, 148595738, null, null, null, 1, null, 7.693878, 0.7693878000000001, null]

      onData(['pu', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.position', 'bitfinex', msgData]))
    })

    it('pc', () => {
      const msgData = ['tAAA:tBBB', 'ACTIVE', -0.00126, 61062.52380952381, 0.0025, 0, 27.43842, 35.66266582339881, 66863.46357142857, 10.000000000000002, null, 148595738, null, null, null, 1, null, 7.693878, 0.7693878000000001, null]

      onData(['pc', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.position.close', 'bitfinex', msgData]))
    })

    it('os', () => {
      const msgData = [
        [89151302196, null, 1647033342683, 'tAAABBB', 1647033342683, 2, 2, 'EXCHANGE LIMIT', null, 'ACTIVE', 50, 0, 0, 0, false, false, false, false, false, null, { scope: 'app' }],
        [89151302197, null, 1647033350546, 'tAAABBB', 1647033350546, 2, 2, 'EXCHANGE LIMIT', null, 'ACTIVE', 80, 0, 0, 0, false, false, false, false, false, null, { scope: 'app' }]
      ]

      onData(['os', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.orders', 'bitfinex', msgData]))
    })

    it('on', () => {
      const msgData = [
        89150813968, null, 1647033262187, 'tAAABBB', 1654443352359, 1654443352361, 2, 2, 'EXCHANGE LIMIT',
        null, null, null, 0, 'ACTIVE', null, null, 25000, 0, 0, 0, null, null, null, 0, 0, null, null, null,
        'API>BFX', null, null, { scope: 'app' }
      ]

      onData(['on', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.order', 'bitfinex', transformOrder(msgData)]))
    })

    it('ou', () => {
      const msgData = [
        89150813968, null, 1647033262187, 'tAAABBB', 1654443352359, 1654443352361, 2, 2, 'EXCHANGE LIMIT',
        null, null, null, 0, 'ACTIVE', null, null, 26000, 0, 0, 0, null, null, null, 0, 0, null, null, null,
        'API>BFX', null, null, { scope: 'app' }
      ]

      onData(['ou', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.order', 'bitfinex', transformOrder(msgData)]))
    })

    it('oc', () => {
      const msgData = [
        89150813968, null, 1647033262187, 'tAAABBB', 1654443352359, 1654443352361, 2, 2, 'EXCHANGE LIMIT',
        null, null, null, 0, 'CANCELED', null, null, 26000, 0, 0, 0, null, null, null, 0, 0, null, null, null,
        'API>BFX', null, null, { scope: 'app' }
      ]

      onData(['oc', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.order.close', 'bitfinex', transformOrder(msgData)]))
    })

    it('n', () => {
      const ucmPayload = {
        status: 'SUCCESS',
        message: 'message'
      }
      const msgData = [1647030350965, 'ucm-hb', 1647030350858, null, ucmPayload, null, null, null]

      onData(['n', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['notify', 'success', 'message', undefined]))
    })
  })

  describe('data on paper mode', () => {
    before(() => {
      openAuthBitfinexConnection({ ...args, isPaper: true })
    })

    it('ws', () => {
      const msgData = [
        ['AAA', 'exchange', 8288.037842747914, null],
        ['BBB', 'exchange', 76499450.78418736, null]
      ]

      onData(['ws', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.balances', 'bitfinex', []]))
    })

    it('wu', () => {
      const msgData = ['AAA', 'exchange', 8288.037842747914, 8288.037842747914]

      onData(['wu', msgData])

      assert.notCalled(ws.send)
    })

    it('ps', () => {
      const msgData = [['tAAA:tBBB', 'ACTIVE', -0.00126, 61062.52380952381, 0.0025, 0, 27.43842, 35.66266582339881, 66863.46357142857, 10.000000000000002, null, 148595738, null, null, null, 1, null, 7.693878, 0.7693878000000001, null]]

      onData(['ps', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.positions', 'bitfinex', []]))
    })

    it('pu', () => {
      const msgData = ['tAAA:tBBB', 'ACTIVE', -0.00126, 61062.52380952381, 0.0025, 0, 27.43842, 35.66266582339881, 66863.46357142857, 10.000000000000002, null, 148595738, null, null, null, 1, null, 7.693878, 0.7693878000000001, null]

      onData(['pu', msgData])

      assert.notCalled(ws.send)
    })

    it('pc', () => {
      const msgData = ['tAAA:tBBB', 'ACTIVE', -0.00126, 61062.52380952381, 0.0025, 0, 27.43842, 35.66266582339881, 66863.46357142857, 10.000000000000002, null, 148595738, null, null, null, 1, null, 7.693878, 0.7693878000000001, null]

      onData(['pc', msgData])

      assert.notCalled(ws.send)
    })

    it('os', () => {
      const msgData = [
        [89151302196, null, 1647033342683, 'tAAABBB', 1647033342683, 2, 2, 'EXCHANGE LIMIT', null, 'ACTIVE', 50, 0, 0, 0, false, false, false, false, false, null],
        [89151302197, null, 1647033350546, 'tAAABBB', 1647033350546, 2, 2, 'EXCHANGE LIMIT', null, 'ACTIVE', 80, 0, 0, 0, false, false, false, false, false, null]
      ]

      onData(['os', msgData])

      assert.calledWithExactly(ws.send, JSON.stringify(['data.orders', 'bitfinex', []]))
    })

    it('on', () => {
      const msgData = [89150813968, null, 1647033262187, 'tAAABBB', 1647033262188, 2, 2, 'EXCHANGE LIMIT', null, 'ACTIVE', 50, 0, 0, 0, false, false, false, false, false, null]

      onData(['on', msgData])

      assert.notCalled(ws.send)
    })

    it('ou', () => {
      const msgData = [89150813968, null, 1647033262187, 'tAAABBB', 1647033262188, 2, 2, 'EXCHANGE LIMIT', null, 'ACTIVE', 60, 0, 0, 0, false, false, false, false, false, null]

      onData(['ou', msgData])

      assert.notCalled(ws.send)
    })

    it('oc', () => {
      const msgData = [89150813968, null, 1647033262187, 'tAAABBB', 1647033262188, 2, 2, 'EXCHANGE LIMIT', null, 'CANCELED', 60, 0, 0, 0, false, false, false, false, false, null]

      onData(['oc', msgData])

      assert.notCalled(ws.send)
    })
  })
})

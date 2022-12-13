/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { assert, createSandbox, spy } = require('sinon')
const { expect } = require('chai')
const proxyquire = require('proxyquire').noCallThru()

describe('on order history', () => {
  const sandbox = createSandbox()
  const isAuthorizedStub = sandbox.stub()
  const orderHistoryStub = sandbox.stub()
  const sendStub = sandbox.stub()

  beforeEach(() => {
    isAuthorizedStub.returns(true)
  })

  afterEach(() => {
    sandbox.reset()
  })

  const handler = proxyquire('ws_servers/api/handlers/on_order_history_request', {
    '../../../util/ws/is_authorized': isAuthorizedStub,
    '../../../util/ws/send': sendStub,
    'bfx-api-node-rest': {
      RESTv2: spy((args) => {
        expect(args).to.eql({
          transform: true,
          url: server.restURL,
          apiKey: bitfinexCredentials.apiKey,
          apiSecret: bitfinexCredentials.apiSecret
        })

        return {
          orderHistory: orderHistoryStub
        }
      })
    }
  })

  const server = {
    restURL: 'rest-url',
    d: sandbox.stub()
  }
  const bitfinexCredentials = {
    apiKey: 'api key',
    apiSecret: 'api secret'
  }
  const ws = {
    isPaper: false,
    getCredentials: () => bitfinexCredentials
  }
  const type = 'get.order_history'
  const authToken = 'auth token'
  const start = 1000
  const end = 3000
  const limit = 800
  const symbol = 'BTC:USDT'
  const msg = [type, authToken, start, end, limit, symbol]

  const order = {
    emptyFill: null,
    id: 82562989492,
    gid: '2040490426368',
    cid: 2051418685440,
    symbol: 'tAAABBB',
    mtsCreate: 1640772166000,
    mtsUpdate: 1648044964000,
    amount: 2,
    amountOrig: 2,
    type: 'EXCHANGE LIMIT',
    typePrev: null,
    mtsTIF: null,
    flags: '0',
    status: 'CANCELED',
    price: 2,
    priceAvg: 0,
    priceTrailing: 0,
    priceAuxLimit: 0,
    notify: false,
    hidden: 0,
    placedId: null,
    routing: 'API>BFX',
    meta: {
      _HF: 1,
      i18n: {
        label: {
          key: 'pingPongSingle.label',
          props: {
            pingPrice: 2,
            pongPrice: 2,
            pingAmount: 2,
            pongAmount: 2
          }
        }
      },
      label: 'Ping/Pong | 2:2 @ 2 -> 2 ',
      aff_code: 'xZvWHMNR',
      lastActive: 1648044964000
    },
    _lastAmount: 2
  }
  const fieldsToBeOmitted = {
    _apiInterface: 1,
    _boolFields: 2,
    _events: 3,
    _eventsCount: 4,
    _fields: 5
  }
  const orders = [{ ...order, ...fieldsToBeOmitted }]

  it('list orders', async () => {
    orderHistoryStub.resolves(orders)

    await handler(server, ws, msg)

    assert.calledWithExactly(isAuthorizedStub, ws, authToken)
    assert.calledWithExactly(orderHistoryStub, symbol, start, end, limit)
    assert.calledWithExactly(sendStub, ws, ['data.order_history', [order]])
  })

  it('filter by scope', async () => {
    const noScopeOrder = { ...order, meta: {} }
    orderHistoryStub.resolves([noScopeOrder])

    await handler(server, ws, msg)

    assert.calledWithExactly(isAuthorizedStub, ws, authToken)
    assert.calledWithExactly(orderHistoryStub, symbol, start, end, limit)
    assert.calledWithExactly(sendStub, ws, ['data.order_history', []])
  })

  it('filter by pair', async () => {
    const paperModeWs = { ...ws, isPaper: true }
    const tBtcOrder = { ...order, symbol: 'tTESTBTC:TESTUSD' }
    const tAaaOrder = { ...order, symbol: 'tAAABBB' }
    orderHistoryStub.resolves([tBtcOrder, tAaaOrder])

    await handler(server, paperModeWs, msg)

    assert.calledWithExactly(isAuthorizedStub, paperModeWs, authToken)
    assert.calledWithExactly(orderHistoryStub, symbol, start, end, limit)
    assert.calledWithExactly(sendStub, paperModeWs, ['data.order_history', [tBtcOrder]])
  })
})

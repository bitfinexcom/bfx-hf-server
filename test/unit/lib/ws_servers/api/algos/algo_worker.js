/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { assert, createSandbox } = require('sinon')
const { expect } = require('chai')
const proxyquire = require('proxyquire').noCallThru()

const sandbox = createSandbox()
const WsStub = sandbox.stub()
const AOHostConstructor = sandbox.stub()
const AOHostStub = {
  on: sandbox.stub(),
  connect: sandbox.stub(),
  getAOInstances: sandbox.stub(),
  removeAllListeners: sandbox.stub(),
  close: sandbox.stub(),
  cleanState: sandbox.stub()
}

const AlgoWorker = proxyquire('ws_servers/api/algos/algo_worker', {
  'bfx-hf-algo': {
    AOHost: sandbox.spy((args) => {
      AOHostConstructor(args)
      return AOHostStub
    })
  }
})

describe('AlgoWorker', () => {
  after(() => {
    sandbox.restore()
  })

  afterEach(() => {
    AOHostConstructor.reset()
    WsStub.reset()
  })

  const settings = {
    dms: 'dms',
    affiliateCode: 'affiliate code',
    wsURL: 'ws url',
    restURL: 'rest url'
  }
  const algoOrders = []
  const bcast = { ws: WsStub }
  const algoDB = { AlgoOrder: { set: sandbox.stub() } }
  const logAlgoOpts = null
  const marketData = new Map()
  const apiKey = 'api key'
  const apiSecret = 'api secret'
  const authToken = 'auth token'

  describe('starting the algo worker', () => {
    const userId = 'user id'

    const authResponse = {
      event: 'auth',
      status: 'OK',
      chanId: 0,
      userId: 123,
      dms: 4,
      auth_id: '5afa2e82',
      caps: {
        orders: {
          read: 1,
          write: 1
        },
        wallets: {
          read: 1,
          write: 1
        }
      }
    }

    it('should create the host and register the events', async () => {
      const aoInstance = {
        state: {
          active: true,
          gid: 'gid',
          name: 'name',
          args: 'args',
          label: 'label'
        }
      }
      AOHostStub.getAOInstances.returns([aoInstance])
      AOHostStub.connect.resolves(authResponse)

      const algoWorker = new AlgoWorker(settings, algoOrders, bcast, algoDB, logAlgoOpts, marketData)
      expect(algoWorker.isStarted).to.be.false

      await algoWorker.start({ apiKey, apiSecret, authToken, userId })

      // generate auth token with api credentials
      // create ao instance
      assert.calledWithExactly(AOHostConstructor, {
        aos: [],
        logAlgoOpts: null,
        wsSettings: {
          apiKey,
          apiSecret,
          authToken,
          dms: 4,
          withHeartbeat: true,
          affiliateCode: settings.affiliateCode,
          wsURL: settings.wsURL,
          restURL: settings.restURL,
          plugins: []
        }
      })
      // register events
      assert.calledWith(AOHostStub.on.firstCall, 'error')
      assert.calledWith(AOHostStub.on.secondCall, 'meta:reload')
      assert.calledWith(AOHostStub.on.thirdCall, 'ao:stopped')
      // connect
      assert.calledWithExactly(AOHostStub.connect)
      // publish opened event
      assert.calledWithExactly(WsStub.firstCall, ['opened', userId, 'bitfinex'])
      // send active instances
      assert.calledWithExactly(WsStub.secondCall, ['data.aos', 'bitfinex', [[
        aoInstance.state.gid,
        aoInstance.state.name,
        aoInstance.state.label,
        aoInstance.state.args
      ]]])
      // final worker inner-state
      expect(algoWorker.userId).to.be.eq(userId)
      expect(algoWorker.isStarted).to.be.true
      expect(algoWorker.host).to.eq(AOHostStub)
      algoWorker.close()
    })
  })

  it('refresh auth args', async () => {
    const adapter = { updateAuthArgs: sandbox.stub() }
    const host = { getAdapter: sandbox.stub().returns(adapter) }
    const algoWorker = new AlgoWorker(settings, algoOrders, bcast, algoDB, logAlgoOpts, marketData)
    algoWorker.host = host
    algoWorker.isStarted = true

    const dms = 1
    await algoWorker.updateAuthArgs({ apiKey, apiSecret, dms })

    assert.calledOnce(host.getAdapter)
    assert.calledWithExactly(adapter.updateAuthArgs, {
      apiKey,
      apiSecret,
      dms
    })
  })



  describe('orders', () => {
    const symbol = 'tAAABBB'
    const symbolDetails = {
      exchange: 'bitfinex',
      lev: 0,
      quote: 'BBB',
      base: 'AAA',
      wsID: 'tAAABBB',
      restID: 'tAAABBB',
      uiID: 'AAA/BBB',
      contexts: [
        'e'
      ],
      p: 1,
      minSize: 2,
      maxSize: 100
    }
    const order = {
      tradeBeyondEnd: false,
      orderType: 'LIMIT',
      amount: 2,
      amountDistortion: 0.01,
      sliceAmount: 2,
      sliceInterval: 2,
      priceDelta: 0,
      price: null,
      priceTarget: 'OB_MID',
      priceCondition: 'MATCH_MIDPOINT',
      lev: 10,
      action: 'Buy',
      _symbol: symbol,
      _margin: false,
      _futures: false
    }
    const validateParams = sandbox.stub()
    const processParams = sandbox.stub()
    const aoID = 'ao-id'
    const ao = {
      meta: {
        validateParams,
        processParams
      }
    }
    const host = {
      getAO: sandbox.stub(),
      startAO: sandbox.stub(),
      loadAO: sandbox.stub()
    }
    const gid = 'gid'
    const serialized = { gid }
    const uiData = {
      name: 'name',
      label: 'label',
      args: {},
      gid
    }

    before(() => {
      marketData.set(symbol, symbolDetails)
    })

    afterEach(() => {
      sandbox.reset()
    })

    describe('submit order', () => {
      it('should start ao', async () => {
        host.getAO.returns(ao)
        host.startAO.resolves([serialized, uiData])
        processParams.returns(order)

        const algoWorker = new AlgoWorker(settings, algoOrders, bcast, algoDB, logAlgoOpts, marketData)
        algoWorker.host = host
        algoWorker.isStarted = true

        const returnedGid = await algoWorker.submitOrder(aoID, order)

        assert.calledWithExactly(processParams, order)
        assert.calledWithExactly(validateParams, order, symbolDetails)
        assert.notCalled(host.loadAO)
        assert.calledWithExactly(host.startAO, aoID, order)
        assert.calledWithExactly(algoDB.AlgoOrder.set, serialized)
        assert.calledWithExactly(WsStub.firstCall, ['notify', 'success', 'Started AO name on Bitfinex'])
        assert.calledWithExactly(WsStub.secondCall, ['data.ao', 'bitfinex', { ...uiData }])
        expect(returnedGid).to.eq(gid)
      })
    })

    describe('load order', () => {
      const state = {}
      const serialized = { gid }

      it('should load ao', async () => {
        host.getAO.returns(ao)
        host.loadAO.resolves([serialized, uiData])

        const algoWorker = new AlgoWorker(settings, algoOrders, bcast, algoDB, logAlgoOpts, marketData)
        algoWorker.host = host
        algoWorker.isStarted = true

        const returnedGid = await algoWorker.loadOrder(aoID, gid, state)

        assert.notCalled(host.startAO)
        assert.calledWithExactly(host.loadAO, aoID, gid, state)
        assert.calledWithExactly(algoDB.AlgoOrder.set, serialized)
        assert.calledWithExactly(WsStub.firstCall, ['notify', 'success', 'Started AO name on Bitfinex'])
        assert.calledWithExactly(WsStub.secondCall, ['data.ao', 'bitfinex', { ...uiData }])
        expect(returnedGid).to.eq(gid)
      })
    })
  })
})

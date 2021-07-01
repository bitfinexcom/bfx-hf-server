/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { assert, createSandbox } = require('sinon')
const { expect } = require('chai')
const proxyquire = require('proxyquire')

const sandbox = createSandbox()
const WsStub = sandbox.stub()
const AOHostConstructor = sandbox.stub()
const AOHostStub = {
  on: sandbox.stub(),
  connect: sandbox.stub(),
  getAOInstances: sandbox.stub()
}
const RestConstructor = sandbox.stub()
const RestStub = {
  generateToken: sandbox.stub()
}

const AlgoWorker = proxyquire('ws_servers/api/algos/algo_worker', {
  'bfx-hf-algo': {
    AOHost: sandbox.spy((args) => {
      AOHostConstructor(args)
      return AOHostStub
    })
  },
  'bfx-api-node-rest': {
    RESTv2: sandbox.spy((args) => {
      RestConstructor(args)
      return RestStub
    })
  }
})

describe('AlgoWorker', () => {
  after(() => {
    sandbox.restore()
  })

  afterEach(() => {
    RestConstructor.reset()
    RestStub.generateToken.reset()
    AOHostConstructor.reset()
  })

  const settings = {
    dms: 'dms',
    affiliateCode: 'affiliate code',
    wsURL: 'ws url',
    restURL: 'rest url'
  }
  const algoOrders = []
  const bcast = { ws: WsStub }
  const algoDB = null
  const logAlgoOpts = null
  const marketData = null
  const config = { auth: { tokenTtlInSeconds: 300 } }

  describe('starting the algo worker', () => {
    const apiKey = 'api key'
    const apiSecret = 'api secret'
    const userId = 'user id'

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

      const authToken = 'generated auth token'
      RestStub.generateToken.resolves([authToken])

      const algoWorker = new AlgoWorker(settings, algoOrders, bcast, algoDB, logAlgoOpts, marketData, config)
      expect(algoWorker.isStarted).to.be.false

      await algoWorker.start({ apiKey, apiSecret, userId })

      // generate auth token with api credentials
      assert.calledWithExactly(RestConstructor, {
        url: settings.restURL,
        apiKey,
        apiSecret,
        transform: true
      })
      assert.calledWithExactly(RestStub.generateToken, {
        scope: 'api',
        writePermission: true,
        ttl: config.auth.tokenTtlInSeconds,
        caps: ['a', 'o', 'w']
      })
      // create ao instance
      assert.calledWithExactly(AOHostConstructor, {
        aos: [],
        logAlgoOpts: null,
        wsSettings: {
          authToken,
          dms: 4,
          withHeartbeat: true,
          affiliateCode: settings.affiliateCode,
          wsURL: settings.wsURL,
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
    })

    it('should skip auth token generation if the token is already provided', async () => {
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

      const authToken = 'provided auth token'
      RestStub.generateToken.rejects()

      const algoWorker = new AlgoWorker(settings, algoOrders, bcast, algoDB, logAlgoOpts, marketData, config)
      expect(algoWorker.isStarted).to.be.false

      await algoWorker.start({ authToken, userId })

      assert.notCalled(RestConstructor)
      assert.notCalled(RestStub.generateToken)
      assert.calledWithExactly(AOHostConstructor, {
        aos: [],
        logAlgoOpts: null,
        wsSettings: {
          authToken,
          dms: 4,
          withHeartbeat: true,
          affiliateCode: settings.affiliateCode,
          wsURL: settings.wsURL,
          plugins: []
        }
      })
    })
  })
})

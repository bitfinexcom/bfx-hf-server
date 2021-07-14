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
const TokenAdapterConstructor = sandbox.stub()
const TokenAdapterStub = {
  refreshToken: sandbox.stub()
}

const AlgoWorker = proxyquire('ws_servers/api/algos/algo_worker', {
  'bfx-hf-algo': {
    AOHost: sandbox.spy((args) => {
      AOHostConstructor(args)
      return AOHostStub
    })
  },
  'bfx-hf-token-renewal-plugin/lib/adapters/bitfinex-adapter': sandbox.spy((args) => {
    TokenAdapterConstructor(args)
    return TokenAdapterStub
  })
})

describe('AlgoWorker', () => {
  after(() => {
    sandbox.restore()
  })

  afterEach(() => {
    AOHostConstructor.reset()
    TokenAdapterConstructor.reset()
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
      TokenAdapterStub.refreshToken.returns({ authToken })

      const algoWorker = new AlgoWorker(settings, algoOrders, bcast, algoDB, logAlgoOpts, marketData, config)
      expect(algoWorker.isStarted).to.be.false

      await algoWorker.start({ apiKey, apiSecret, userId })

      // generate auth token with api credentials
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
          plugins: [algoWorker.tokenPlugin]
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

      const algoWorker = new AlgoWorker(settings, algoOrders, bcast, algoDB, logAlgoOpts, marketData, config)
      expect(algoWorker.isStarted).to.be.false

      await algoWorker.start({ authToken, userId })

      assert.notCalled(TokenAdapterConstructor)
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
      algoWorker.close()
    })
  })
})

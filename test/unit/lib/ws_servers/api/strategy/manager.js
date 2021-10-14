/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { expect } = require('chai')
const { assert, createSandbox } = require('sinon')
const proxyquire = require('proxyquire').noCallThru()

const sandbox = createSandbox()
const restV2Stub = sandbox.stub()
const executeStrategyStub = sandbox.stub()
const ManagerConstructor = sandbox.stub()
const WatchdogConstructor = sandbox.stub()
const onceWsStub = sandbox.stub()
const closeAllSocketStub = sandbox.stub()

const ManagerStub = {
  onWS: sandbox.stub(),
  onceWS: onceWsStub,
  openWS: sandbox.stub(),
  closeAllSockets: closeAllSocketStub
}

const StrategyManager = proxyquire('../../../../../../lib/ws_servers/api/handlers/strategy/strategy_manager', {
  'bfx-hf-strategy-exec': executeStrategyStub,
  'bfx-api-node-rest': { RESTv2: restV2Stub },
  'bfx-api-node-core': {
    Manager: sandbox.spy((args) => {
      ManagerConstructor(args)
      return ManagerStub
    })
  },
  'bfx-api-node-plugin-wd': sandbox.spy((args) => {
    WatchdogConstructor(args)
    return 'watchdog'
  })
})

describe('Strategy Manager', () => {
  const wsURL = 'ws url'
  const restURL = 'rest url'
  const dms = 'dms'
  const apiKey = 'api key'
  const apiSecret = 'api secret'
  const authToken = 'auth token'
  const settings = { wsURL, restURL, dms }

  const ws = { conn: 'connection details' }
  const parsedStrategy = { indicators: 'indicators' }
  const strategyOpts = { symbol: 'symbol' }

  afterEach(() => {
    sandbox.restore()
  })

  describe('#constructor', () => {
    it('creates a new instance', () => {
      const manager = new StrategyManager(settings)

      expect(manager.active).to.be.false
      expect(manager.ws2Manager).to.be.null
      expect(manager.strategy).to.be.an('object')
      expect(manager.strategyArgs).to.be.an('object')
      expect(manager.wsURL).to.eq(wsURL)
      expect(manager.restURL).to.eq(restURL)
      expect(manager.settings).to.eq(settings)

      assert.calledWithExactly(restV2Stub, {
        url: restURL,
        transform: true
      })
    })
  })

  describe('#start method', async () => {
    it('should call the manager and watchdog plugin with correct arguments', async () => {
      const manager = new StrategyManager(settings)
      onceWsStub.withArgs('event:auth:success').yields('auth response', ws)

      await manager.start({ apiKey, apiSecret, authToken })

      assert.calledWithExactly(ManagerConstructor, {
        apiKey,
        apiSecret,
        authToken,
        transform: true,
        wsURL,
        dms,
        plugins: ['watchdog']
      })

      assert.calledWithExactly(WatchdogConstructor, {
        autoReconnect: true,
        reconnectDelay: 5000,
        packetWDDelay: 10000
      })
    })

    it('should set the ws object on auth success', async () => {
      const manager = new StrategyManager(settings)
      onceWsStub.withArgs('event:auth:success').yields('auth response', ws)

      await manager.start({ apiKey, apiSecret, authToken })
      expect(manager.strategy.ws).to.eq(ws)
    })

    it('should throw error on auth failure', async () => {
      const manager = new StrategyManager(settings)
      onceWsStub.withArgs('event:auth:error').yields('auth err response')
      try {
        await manager.start({ apiKey, apiSecret, authToken })
      } catch (err) {
        expect(err).to.eq('auth err response')
      }
    })
  })

  describe('#execute method', async () => {
    it('should execute strategy and set the status as active', async () => {
      const manager = new StrategyManager(settings)
      expect(manager.ws2Manager).to.be.null
      expect(manager.active).to.be.false

      onceWsStub.withArgs('event:auth:success').yields('auth response', ws)

      await manager.start({ apiKey, apiSecret, authToken })
      expect(manager.ws2Manager).to.eq(ManagerStub)
      expect(manager.strategy.ws).to.eq(ws)

      await manager.execute(parsedStrategy, strategyOpts)

      const executeStrategyArguments = executeStrategyStub.args[0]
      expect(executeStrategyArguments[0]).to.eql({ ws, ...parsedStrategy })
      expect(executeStrategyArguments[1]).to.eq(manager.ws2Manager)
      expect(executeStrategyArguments[2]).to.eq(manager.rest)
      expect(executeStrategyArguments[3]).to.eq(strategyOpts)

      expect(manager.strategyArgs).to.eql(strategyOpts)
      expect(manager.active).to.be.true
    })
  })

  describe('#close method', () => {
    it('closes the socket connections, falsifies the active status and clears strategy', async () => {
      const manager = new StrategyManager(settings)
      onceWsStub.withArgs('event:auth:success').yields('auth response', ws)

      await manager.start({ apiKey, apiSecret, authToken })
      await manager.execute(parsedStrategy, strategyOpts)

      manager.close()
      expect(closeAllSocketStub.calledOnce).to.be.true
      expect(manager.active).to.be.false
      expect(manager.strategy).to.be.an('object').and.to.be.empty
    })
  })
})

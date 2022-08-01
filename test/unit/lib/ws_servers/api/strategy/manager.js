/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { expect } = require('chai')
const { assert, createSandbox } = require('sinon')
const proxyquire = require('proxyquire').noCallThru()

const { WD_PACKET_DELAY, WD_RECONNECT_DELAY } = require('../../../../../../lib/constants')

const sandbox = createSandbox()
const WsStub = sandbox.stub()
const restV2Stub = sandbox.stub()
const ManagerConstructor = sandbox.stub()
const StrategyExecutionConstructor = sandbox.stub()
const WatchdogConstructor = sandbox.stub()
const onceWsStub = sandbox.stub()
const closeAllSocketStub = sandbox.stub()
const withDataSocketStub = sandbox.stub()
const saveStrategyExecutionStub = sandbox.stub()
const startPerformanceWatchers = sandbox.stub()

const StrategyExecutionDBStub = {
  StrategyExecution: {
    set: saveStrategyExecutionStub.resolves()
  }
}

const ManagerStub = {
  onWS: sandbox.stub(),
  onceWS: onceWsStub,
  openWS: sandbox.stub(),
  closeAllSockets: closeAllSocketStub,
  withDataSocket: withDataSocketStub
}

const StrategyExecutionStub = {
  on: sandbox.stub(),
  execute: sandbox.stub(),
  stopExecution: sandbox.stub(),
  generateResults: sandbox.stub(),
  removeAllListeners: sandbox.stub()
}

const PriceFeedStub = {
  close: sandbox.stub()
}

const PerformanceManagerStub = {
  close: sandbox.stub()
}

const asyncTimeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const StrategyManager = proxyquire('../../../../../../lib/ws_servers/api/handlers/strategy/strategy_manager', {
  'bfx-hf-strategy-exec': sandbox.spy((args) => {
    StrategyExecutionConstructor(args)
    return StrategyExecutionStub
  }),
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
  }),
  'bfx-hf-strategy-perf': {
    PriceFeed: sandbox.spy((args) => {
      return PriceFeedStub
    }),
    PerformanceManager: sandbox.spy((args) => {
      return PerformanceManagerStub
    }),
    StartWatchers: startPerformanceWatchers
  }
})

describe('Strategy Manager', () => {
  const wsURL = 'ws url'
  const restURL = 'rest url'
  const dms = false
  const apiKey = 'api key'
  const apiSecret = 'api secret'
  const authToken = 'auth token'
  const settings = { wsURL, restURL, dms, closeConnectionsDelay: 500 }
  const bcast = WsStub

  const ws = { conn: 'connection details' }
  const parsedStrategy = {
    indicators: 'indicators',
    priceFeed: PriceFeedStub,
    perfManager: PerformanceManagerStub
  }
  const strategyOptions = {
    symbol: 'tETHUSD',
    timeframe: '1m',
    trades: false
  }

  after(() => {
    sandbox.restore()
  })

  afterEach(() => {
    sandbox.reset()
  })

  describe('#constructor', () => {
    it('creates a new instance', () => {
      const manager = new StrategyManager(settings, bcast)

      expect(manager.ws2Manager).to.be.null
      expect(manager.ws).to.be.null
      expect(manager.strategy.size).to.eq(0)
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
      const manager = new StrategyManager(settings, bcast)
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
        reconnectDelay: WD_RECONNECT_DELAY,
        packetWDDelay: WD_PACKET_DELAY
      })
    })

    it('should set the ws object on auth success', async () => {
      const manager = new StrategyManager(settings, bcast)
      onceWsStub.withArgs('event:auth:success').yields('auth response', ws)

      await manager.start({ apiKey, apiSecret, authToken })
      expect(manager.ws).to.eq(ws)
    })

    it('should throw error on auth failure', async () => {
      const manager = new StrategyManager(settings, bcast)
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
      const manager = new StrategyManager(settings, bcast)
      expect(manager.ws2Manager).to.be.null

      onceWsStub.withArgs('event:auth:success').yields('auth response', ws)

      await manager.start({ apiKey, apiSecret, authToken })
      expect(manager.ws2Manager).to.eq(ManagerStub)
      expect(manager.ws).to.eq(ws)

      await manager.execute(parsedStrategy, strategyOptions)

      assert.calledWithExactly(StrategyExecutionConstructor, {
        strategy: { ws, ...parsedStrategy },
        ws2Manager: manager.ws2Manager,
        rest: manager.rest,
        strategyOptions,
        priceFeed: PriceFeedStub,
        perfManager: PerformanceManagerStub
      })
      expect(StrategyExecutionStub.execute.calledOnce).to.be.true
      expect(manager.strategy.size).to.eq(1)
    })
  })

  describe('#close method', () => {
    it('stop live execution, generates results, clears strategy, saves strategy execution results in database and close all sockets', async () => {
      const manager = new StrategyManager(settings, bcast, StrategyExecutionDBStub)
      onceWsStub.withArgs('event:auth:success').yields('auth response', ws)

      await manager.start({ apiKey, apiSecret, authToken })
      await manager.execute(parsedStrategy, strategyOptions)

      const strategyMapKeys = manager.strategy.keys()

      await manager.close(strategyMapKeys.next().value)

      expect(StrategyExecutionStub.stopExecution.calledOnce).to.be.true
      expect(StrategyExecutionStub.generateResults.calledThrice).to.be.true
      expect(StrategyExecutionStub.removeAllListeners.calledOnce).to.be.true
      expect(manager.strategy.size).to.eq(0)
      expect(StrategyExecutionDBStub.StrategyExecution.set.calledOnce).to.be.true

      await asyncTimeout(manager.closeConnectionsDelay)

      expect(closeAllSocketStub.calledOnce).to.be.true
    })
  })

  describe('#_unsubscribeChannels', () => {
    it('should not unsubscribe if one of the remaining active strategies is subscribed to the same candle channel', async () => {
      const manager = new StrategyManager(settings, bcast, StrategyExecutionDBStub)
      onceWsStub.withArgs('event:auth:success').yields('auth response', {
        ...ws,
        channels: {
          1: { channel: 'candles', chanId: 1, key: 'trade:1m:tETHUSD' }
        }
      })
      sandbox.stub(manager, '_unsubscribe')

      await manager.start({ apiKey, apiSecret, authToken })
      await manager.execute({ ...parsedStrategy, id: 1 }, strategyOptions)
      await manager.execute({ ...parsedStrategy, id: 2 }, strategyOptions)

      const strategyMapKeys = manager.strategy.keys()
      await manager.close(strategyMapKeys.next().value)

      expect(manager._unsubscribe.called).to.be.false
    })

    it('should unsubscribe if none of the remaining active strategies is not subscribed to the same candle channel', async () => {
      const manager = new StrategyManager(settings, bcast, StrategyExecutionDBStub)
      onceWsStub.withArgs('event:auth:success').yields('auth response', {
        ...ws,
        channels: {
          1: { channel: 'candles', chanId: 1, key: 'trade:1m:tETHUSD' }
        }
      })
      sandbox.stub(manager, '_unsubscribe')

      await manager.start({ apiKey, apiSecret, authToken })
      await manager.execute(parsedStrategy, strategyOptions)

      const strategyMapKeys = manager.strategy.keys()
      await manager.close(strategyMapKeys.next().value)

      assert.calledWithExactly(manager._unsubscribe, 'candles', { key: 'trade:1m:tETHUSD' })
    })

    it('should not unsubscribe if one of the remaining active strategies is subscribed to the same candle and trade channel', async () => {
      const manager = new StrategyManager(settings, bcast, StrategyExecutionDBStub)
      onceWsStub.withArgs('event:auth:success').yields('auth response', {
        ...ws,
        channels: {
          1: { channel: 'candles', chanId: 1, key: 'trade:1m:tETHUSD' },
          2: { channel: 'trades', chanId: 2, symbol: 'tETHUSD', pair: 'ETHUSD' }
        }
      })
      sandbox.stub(manager, '_unsubscribe')

      await manager.start({ apiKey, apiSecret, authToken })
      await manager.execute({ ...parsedStrategy, id: 1 }, { ...strategyOptions, trades: true })
      await manager.execute({ ...parsedStrategy, id: 2 }, { ...strategyOptions, trades: true })

      const strategyMapKeys = manager.strategy.keys()
      await manager.close(strategyMapKeys.next().value)

      expect(manager._unsubscribe.called).to.be.false
    })

    it('should unsubscribe if none of the remaining active strategies is not subscribed to the same candle and trade channels', async () => {
      const manager = new StrategyManager(settings, bcast, StrategyExecutionDBStub)
      onceWsStub.withArgs('event:auth:success').yields('auth response', {
        ...ws,
        channels: {
          1: { channel: 'candles', chanId: 1, key: 'trade:1m:tETHUSD' },
          2: { channel: 'trades', chanId: 2, symbol: 'tETHUSD', pair: 'ETHUSD' }
        }
      })
      sandbox.stub(manager, '_unsubscribe')

      await manager.start({ apiKey, apiSecret, authToken })
      await manager.execute(parsedStrategy, { ...strategyOptions, trades: true })

      const strategyMapKeys = manager.strategy.keys()
      await manager.close(strategyMapKeys.next().value)

      assert.calledWithExactly(manager._unsubscribe, 'candles', { key: 'trade:1m:tETHUSD' })
      assert.calledWithExactly(manager._unsubscribe, 'trades', { symbol: 'tETHUSD' })
    })

    it('should unsubscribe only trades channel if none of the remaining active strategies are subscribed to the same trade channel', async () => {
      const manager = new StrategyManager(settings, bcast, StrategyExecutionDBStub)
      onceWsStub.withArgs('event:auth:success').yields('auth response', {
        ...ws,
        channels: {
          1: { channel: 'candles', chanId: 1, key: 'trade:1m:tETHUSD' },
          2: { channel: 'trades', chanId: 2, symbol: 'tETHUSD', pair: 'ETHUSD' }
        }
      })
      sandbox.stub(manager, '_unsubscribe')

      await manager.start({ apiKey, apiSecret, authToken })
      await manager.execute({ ...parsedStrategy, id: 1 }, { ...strategyOptions, trades: true })

      const strategyMapKeys = manager.strategy.keys()
      await manager.close(strategyMapKeys.next().value)

      assert.calledWithExactly(manager._unsubscribe, 'trades', { symbol: 'tETHUSD' })
    })
  })

  describe('#stopAllActiveStrategies', () => {
    it('should stop all active strategies', async () => {
      const manager = new StrategyManager(settings, bcast, StrategyExecutionDBStub)
      onceWsStub.withArgs('event:auth:success').yields('auth response', ws)

      sandbox.stub(manager, 'close')
      await manager.start({ apiKey, apiSecret, authToken })
      await manager.execute({ ...parsedStrategy, id: 1 }, strategyOptions)
      await manager.execute({ ...parsedStrategy, id: 2 }, strategyOptions)
      await manager.execute({ ...parsedStrategy, id: 3 }, strategyOptions)

      await manager.stopAllActiveStrategies()

      expect(manager.close.calledThrice).to.be.true
    })
  })
})

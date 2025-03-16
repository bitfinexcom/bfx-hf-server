/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const proxyquire = require('proxyquire').noCallThru()
const { assert, createSandbox } = require('sinon')
const { expect } = require('chai')
const { WD_PACKET_DELAY } = require('../../../../../lib/constants')

describe('ConnectionManager', () => {
  const sandbox = createSandbox()

  const startWorkerStub = sandbox.stub()
  const algoWorker = {
    start: (args) => {
      algoWorker.isOpen = true
      return startWorkerStub(args)
    }
  }

  const sessionId = 'session_id'
  const db = sandbox.stub()
  const d = sandbox.stub()
  const algoDB = sandbox.stub()
  const apiKey = 'api key'
  const apiSecret = 'api secret'
  const wsURL = 'ws url'
  const restURL = 'rest url'
  const dmsScope = 'scope'
  const mode = 'main'
  const packetWDDelay = WD_PACKET_DELAY
  const isPaper = true
  const settings = { dms: true, packetWDDelay }
  const server = {
    db,
    d,
    wsURL,
    restURL,
    algoDB
  }
  const session = {
    id: sessionId,
    mode,
    dmsScope,
    isPaper,
    getCredentials: sandbox.stub(),
    getAlgoWorker: sandbox.stub(),
    setAlgoWorker: sandbox.stub(),
    getStrategyManager: sandbox.stub(),
    setStrategyManager: sandbox.stub(),
    getClient: sandbox.stub(),
    setClient: sandbox.stub(),
    sendDataToMetricsServer: sandbox.stub()
  }
  const filteredWs = sandbox.stub()
  const strategyManager = sandbox.stub()

  const createClient = sandbox.stub()
  const getUserSettings = sandbox.stub()
  const createAlgoWorker = sandbox.stub()
  const createFilteredWs = sandbox.stub()
  const createStrategyManager = sandbox.stub()
  const resendSnapshots = sandbox.stub()
  const sendError = sandbox.stub()
  const send = sandbox.stub()

  const bfxClient = { isOpen: true }

  afterEach(() => {
    sandbox.reset()
  })

  beforeEach(() => {
    getUserSettings.resolves(settings)
    createClient.returns(bfxClient)
    createAlgoWorker.returns(algoWorker)
    createFilteredWs.returns(filteredWs)
    createStrategyManager.returns(strategyManager)
    session.getCredentials.returns({ apiKey, apiSecret })
    session.getAlgoWorker.returns(algoWorker)
  })

  const manager = proxyquire('ws_servers/api/start_connections', {
    './open_auth_bitfinex_connection': createClient,
    '../../util/user_settings': getUserSettings,
    './factories/create_algo_worker': createAlgoWorker,
    './factories/created_filtered_ws': createFilteredWs,
    './factories/create_strategy_manager': createStrategyManager,
    './snapshots/send_all': resendSnapshots,
    '../../util/ws/send_error': sendError,
    '../../util/ws/send': send
  })

  it('start', async () => {
    await manager.start(server, session)

    assert.calledWithExactly(createFilteredWs, session)

    assert.calledWithExactly(getUserSettings, db)

    assert.calledWithExactly(session.getAlgoWorker)
    assert.calledWithExactly(createAlgoWorker, server, session, filteredWs, settings)
    assert.calledWithExactly(session.setAlgoWorker, algoWorker)
    assert.calledWithExactly(startWorkerStub, { apiKey, apiSecret, userId: 'HF_User' })

    assert.calledWithExactly(session.getStrategyManager)
    assert.calledWithExactly(createStrategyManager, server, session, filteredWs, dmsScope, settings, session.sendDataToMetricsServer)
    assert.calledWithExactly(session.setStrategyManager, strategyManager)

    assert.calledWithExactly(session.getClient)
    assert.calledWithExactly(createClient, {
      apiKey,
      apiSecret,
      d,
      wsURL,
      restURL,
      isPaper,
      dmsScope,
      ws: filteredWs,
      dms: false,
      sendDataToMetricsServer: session.sendDataToMetricsServer,
      mode,
      session,
      algoDB,
      packetWDDelay
    })
    assert.calledWithExactly(session.setClient, bfxClient)

    expect(manager.credentials.main.apiKey).to.be.eq(apiKey)
    expect(manager.credentials.main.apiSecret).to.be.eq(apiSecret)
  })

  it('toggle mode', async () => {
    const mode = 'paper'
    const apiKey = 'paper key'
    const apiSecret = 'paper secret'
    const isPaper = true

    const paperSession = { ...session, mode, isPaper }
    paperSession.getCredentials.returns({ apiKey, apiSecret })

    await manager.start(server, paperSession)

    assert.calledWithExactly(getUserSettings, db)

    assert.calledWithExactly(startWorkerStub, { apiKey, apiSecret, userId: 'HF_User' })

    assert.calledWithExactly(createClient, {
      apiKey,
      apiSecret,
      d,
      wsURL,
      restURL,
      isPaper,
      dmsScope,
      ws: filteredWs,
      dms: false,
      sendDataToMetricsServer: paperSession.sendDataToMetricsServer,
      mode,
      session: paperSession,
      algoDB,
      packetWDDelay
    })

    expect(manager.credentials.paper.apiKey).to.be.eq(apiKey)
    expect(manager.credentials.paper.apiSecret).to.be.eq(apiSecret)
  })

  it('returns to previous mode', async () => {
    session.getAlgoWorker.returns(algoWorker)
    session.getClient.returns(bfxClient)
    session.getStrategyManager.returns(strategyManager)
    resendSnapshots.resolves()

    await manager.start(server, session)

    assert.notCalled(createAlgoWorker)
    assert.notCalled(startWorkerStub)
    assert.notCalled(createClient)
    assert.notCalled(createStrategyManager)

    assert.calledWithExactly(resendSnapshots, session, filteredWs)
  })

  it('disable dms', async () => {
    getUserSettings.resolves({ dms: false })
    session.getAlgoWorker.returns(algoWorker)
    session.getClient.returns(bfxClient)
    session.getStrategyManager.returns(strategyManager)
    resendSnapshots.resolves()

    await manager.start(server, session)

    assert.notCalled(createAlgoWorker)
    assert.notCalled(startWorkerStub)
    assert.notCalled(createClient)
    assert.notCalled(createStrategyManager)
  })

  it('update credentials', async () => {
    const apiSecret = 'new secret'

    session.getAlgoWorker.returns(algoWorker)
    session.getClient.returns(bfxClient)
    session.getStrategyManager.returns(strategyManager)
    resendSnapshots.resolves()
    session.getCredentials.returns({ apiKey, apiSecret })

    await manager.start(server, session)

    assert.calledWithExactly(getUserSettings, db)
    assert.notCalled(createStrategyManager)

    assert.calledWithExactly(startWorkerStub, { apiKey, apiSecret, userId: 'HF_User' })
    assert.calledWithExactly(createClient, {
      apiKey,
      apiSecret,
      d,
      wsURL,
      restURL,
      isPaper,
      dmsScope,
      ws: filteredWs,
      dms: false,
      sendDataToMetricsServer: session.sendDataToMetricsServer,
      mode,
      session,
      algoDB,
      packetWDDelay
    })

    expect(manager.credentials.main.apiKey).to.be.eq(apiKey)
    expect(manager.credentials.main.apiSecret).to.be.eq(apiSecret)
  })
})

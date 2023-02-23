/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const proxyquire = require('proxyquire').noCallThru()
const { assert, createSandbox } = require('sinon')
const { expect } = require('chai')

describe('ConnectionManager', () => {
  const sandbox = createSandbox()

  const openDmsSub = sandbox.stub()
  const dmsControl = {
    open: (args) => {
      dmsControl.isOpen = true
      return openDmsSub(args)
    },
    updateStatus: sandbox.stub()
  }

  const startWorkerStub = sandbox.stub()
  const algoWorker = {
    start: (args) => {
      algoWorker.isOpen = true
      return startWorkerStub(args)
    }
  }

  const openMetricsClientStub = sandbox.stub()
  const authMetricsClientStub = sandbox.stub()
  const metricsClient = {
    open: () => {
      metricsClient.isOpen = true
      return openMetricsClientStub()
    },
    auth: (args) => {
      metricsClient.isAuthenticated = true
      return authMetricsClientStub(args)
    },
    sendAuidInfo: sandbox.stub()
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
  const isPaper = true
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
    metricsClient,
    getCredentials: sandbox.stub(),
    getDmsControl: sandbox.stub(),
    setDmsControl: sandbox.stub(),
    getAlgoWorker: sandbox.stub(),
    setAlgoWorker: sandbox.stub(),
    getStrategyManager: sandbox.stub(),
    setStrategyManager: sandbox.stub(),
    getMetricsClient: sandbox.stub(),
    setMetricsClient: sandbox.stub(),
    getClient: sandbox.stub(),
    setClient: sandbox.stub(),
    sendDataToMetricsServer: sandbox.stub()
  }
  const filteredWs = sandbox.stub()
  const strategyManager = sandbox.stub()

  const createClient = sandbox.stub()
  const getUserSettings = sandbox.stub()
  const createAlgoWorker = sandbox.stub()
  const createDmsControl = sandbox.stub()
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
    getUserSettings.resolves({ dms: true })
    openDmsSub.resolves()
    createClient.returns(bfxClient)
    createDmsControl.returns(dmsControl)
    createAlgoWorker.resolves(algoWorker)
    createFilteredWs.returns(filteredWs)
    createStrategyManager.returns(strategyManager)
    session.getMetricsClient.returns(metricsClient)
    session.getCredentials.returns({ apiKey, apiSecret })
    session.getAlgoWorker.returns(algoWorker)
  })

  const manager = proxyquire('ws_servers/api/start_connections', {
    './open_auth_bitfinex_connection': createClient,
    '../../util/user_settings': getUserSettings,
    './factories/create_algo_worker': createAlgoWorker,
    './factories/create_dms_control': createDmsControl,
    './factories/created_filtered_ws': createFilteredWs,
    './factories/create_strategy_manager': createStrategyManager,
    // './factories/create_metrics_client': createMetricsClient,
    './snapshots/send_all': resendSnapshots,
    '../../util/ws/send_error': sendError,
    '../../util/ws/send': send
  })

  it('start', async () => {
    await manager.start(server, session)

    assert.calledWithExactly(createFilteredWs, session)

    assert.calledWithExactly(getUserSettings, db)
    assert.notCalled(dmsControl.updateStatus)
    assert.calledWithExactly(createDmsControl, server)
    assert.calledWithExactly(session.setDmsControl, dmsControl)
    assert.calledWithExactly(openDmsSub, { apiKey, apiSecret, dmsScope })

    assert.calledWithExactly(session.getAlgoWorker)
    assert.calledWithExactly(createAlgoWorker, server, session, filteredWs)
    assert.calledWithExactly(session.setAlgoWorker, algoWorker)
    assert.calledWithExactly(startWorkerStub, { apiKey, apiSecret, userId: 'HF_User' })

    assert.calledWithExactly(session.getStrategyManager)
    assert.calledWithExactly(createStrategyManager, server, session, filteredWs, dmsScope, session.sendDataToMetricsServer)
    assert.calledWithExactly(session.setStrategyManager, strategyManager)

    assert.calledWithExactly(session.getMetricsClient)
    assert.calledWithExactly(session.setMetricsClient, metricsClient)
    assert.calledWithExactly(openMetricsClientStub)
    assert.calledWithExactly(authMetricsClientStub, { apiKey, apiSecret, scope: dmsScope })

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
      algoDB
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

    assert.calledWithExactly(authMetricsClientStub, { apiKey, apiSecret, scope: dmsScope })

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
      algoDB
    })

    expect(manager.credentials.paper.apiKey).to.be.eq(apiKey)
    expect(manager.credentials.paper.apiSecret).to.be.eq(apiSecret)
  })

  it('returns to previous mode', async () => {
    session.getDmsControl.returns(dmsControl)
    session.getAlgoWorker.returns(algoWorker)
    session.getClient.returns(bfxClient)
    session.getStrategyManager.returns(strategyManager)
    session.getMetricsClient.returns(metricsClient)
    resendSnapshots.resolves()

    await manager.start(server, session)

    assert.calledWithExactly(dmsControl.updateStatus, true)
    assert.calledWithExactly(metricsClient.sendAuidInfo)
    assert.notCalled(createAlgoWorker)
    assert.notCalled(openDmsSub)
    assert.notCalled(startWorkerStub)
    assert.notCalled(createClient)
    assert.notCalled(createStrategyManager)

    assert.calledWithExactly(resendSnapshots, session, filteredWs)
  })

  it('disable dms', async () => {
    getUserSettings.resolves({ dms: false })
    session.getDmsControl.returns(dmsControl)
    session.getAlgoWorker.returns(algoWorker)
    session.getClient.returns(bfxClient)
    session.getStrategyManager.returns(strategyManager)
    session.getMetricsClient.returns(metricsClient)
    resendSnapshots.resolves()

    await manager.start(server, session)

    assert.calledWithExactly(dmsControl.updateStatus, false)
    assert.notCalled(createAlgoWorker)
    assert.notCalled(openDmsSub)
    assert.notCalled(startWorkerStub)
    assert.notCalled(createClient)
    assert.notCalled(createStrategyManager)
  })

  it('update credentials', async () => {
    const apiSecret = 'new secret'

    session.getDmsControl.returns(dmsControl)
    session.getAlgoWorker.returns(algoWorker)
    session.getClient.returns(bfxClient)
    session.getStrategyManager.returns(strategyManager)
    session.getMetricsClient.returns(metricsClient)
    resendSnapshots.resolves()
    session.getCredentials.returns({ apiKey, apiSecret })

    await manager.start(server, session)

    assert.calledWithExactly(getUserSettings, db)
    assert.calledWithExactly(dmsControl.updateStatus, true)
    assert.notCalled(openDmsSub)
    assert.notCalled(createStrategyManager)

    assert.calledWithExactly(startWorkerStub, { apiKey, apiSecret, userId: 'HF_User' })
    assert.calledWithExactly(authMetricsClientStub, { apiKey, apiSecret, scope: dmsScope })
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
      algoDB
    })

    expect(manager.credentials.main.apiKey).to.be.eq(apiKey)
    expect(manager.credentials.main.apiSecret).to.be.eq(apiSecret)
  })
})

'use strict'

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

  const server = {
    createAlgoWorker: sandbox.stub()
  }
  const ws = {
    clients: {},
    workers: {},
    algoWorker: { isStarted: false },
    dmsControl
  }
  const db = sandbox.stub()
  const d = sandbox.stub()
  const apiKey = 'api key'
  const apiSecret = 'api secret'
  const wsURL = 'ws url'
  const restURL = 'rest url'
  const hostedURL = 'hosted url'
  const dmsScope = 'scope'
  const mode = 'main'
  const isPaper = true

  const args = {
    server,
    ws,
    db,
    d,
    apiKey,
    apiSecret,
    wsURL,
    restURL,
    hostedURL,
    dmsScope,
    mode,
    isPaper
  }

  const openAuthBitfinexConnection = sandbox.stub()
  const getUserSettings = sandbox.stub()
  const bfxClient = { isOpen: true }

  afterEach(() => {
    sandbox.reset()
  })

  beforeEach(() => {
    getUserSettings.resolves({ dms: true })
    openDmsSub.resolves()
    openAuthBitfinexConnection.returns(bfxClient)
  })

  const manager = proxyquire('ws_servers/api/start_connections', {
    './open_auth_bitfinex_connection': openAuthBitfinexConnection,
    '../../util/user_settings': getUserSettings
  })

  it('start', async () => {
    server.createAlgoWorker.resolves(algoWorker)

    await manager.start(args)

    assert.calledWithExactly(getUserSettings, db)
    assert.notCalled(dmsControl.updateStatus)
    assert.calledWithExactly(openDmsSub, { apiKey, apiSecret, scope: dmsScope })

    assert.calledWithExactly(startWorkerStub, { apiKey, apiSecret, userId: 'HF_User' })

    assert.calledWithExactly(openAuthBitfinexConnection, {
      ws,
      d,
      dms: false,
      apiKey,
      apiSecret,
      wsURL,
      restURL,
      isPaper
    })
    expect(ws.clients.bitfinex).not.to.be.empty
    expect(ws.clients.main).not.to.be.empty

    expect(manager.credentials.main.apiKey).to.be.eq(apiKey)
    expect(manager.credentials.main.apiSecret).to.be.eq(apiSecret)
    expect(manager.starting).to.be.false
  })

  it('toggle mode', async () => {
    server.createAlgoWorker.resolves(algoWorker)

    const mode = 'paper'
    const apiKey = 'paper key'
    const apiSecret = 'paper secret'
    const isPaper = true

    await manager.start({
      ...args,
      mode,
      apiKey,
      apiSecret
    })

    assert.calledWithExactly(getUserSettings, db)

    assert.calledWithExactly(startWorkerStub, { apiKey, apiSecret, userId: 'HF_User' })

    assert.calledWithExactly(openAuthBitfinexConnection, {
      ws,
      d,
      dms: false,
      apiKey,
      apiSecret,
      wsURL,
      restURL,
      isPaper
    })
    expect(ws.clients.bitfinex).not.to.be.empty
    expect(ws.clients.main).not.to.be.empty

    expect(manager.credentials.paper.apiKey).to.be.eq(apiKey)
    expect(manager.credentials.paper.apiSecret).to.be.eq(apiSecret)
    expect(manager.starting).to.be.false
  })

  it('returns to previous mode', async () => {
    await manager.start(args)

    assert.calledWithExactly(dmsControl.updateStatus, true)
    assert.notCalled(server.createAlgoWorker)
    assert.notCalled(openDmsSub)
    assert.notCalled(startWorkerStub)
    assert.notCalled(openAuthBitfinexConnection)
    expect(manager.starting).to.be.false
  })

  it('disable dms', async () => {
    getUserSettings.resolves({ dms: false })

    await manager.start(args)

    assert.calledWithExactly(dmsControl.updateStatus, false)
    assert.notCalled(openDmsSub)
    assert.notCalled(startWorkerStub)
    assert.notCalled(openAuthBitfinexConnection)
    expect(manager.starting).to.be.false
  })

  it('update credentials', async () => {
    server.createAlgoWorker.resolves(algoWorker)

    const apiSecret = 'new secret'
    await manager.start({
      ...args,
      apiSecret
    })

    assert.calledWithExactly(getUserSettings, db)
    assert.calledWithExactly(dmsControl.updateStatus, true)
    assert.notCalled(openDmsSub)

    assert.calledWithExactly(startWorkerStub, { apiKey, apiSecret, userId: 'HF_User' })

    assert.calledWithExactly(openAuthBitfinexConnection, {
      ws,
      d,
      dms: false,
      apiKey,
      apiSecret,
      wsURL,
      restURL,
      isPaper
    })
    expect(ws.clients).to.haveOwnProperty('bitfinex')

    expect(manager.credentials.main.apiKey).to.be.eq(apiKey)
    expect(manager.credentials.main.apiSecret).to.be.eq(apiSecret)
    expect(manager.starting).to.be.false
  })
})

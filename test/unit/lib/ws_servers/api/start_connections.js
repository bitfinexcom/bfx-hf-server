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

  const ws = {
    clients: {},
    algoWorker,
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
  const isPaper = true

  const args = {
    ws,
    db,
    d,
    apiKey,
    apiSecret,
    wsURL,
    restURL,
    hostedURL,
    dmsScope,
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
    expect(ws.clients).to.haveOwnProperty('bitfinex')

    expect(manager.apiKey).to.be.eq(apiKey)
    expect(manager.apiSecret).to.be.eq(apiSecret)
    expect(manager.starting).to.be.false
  })

  it('duplicated start', async () => {
    await manager.start(args)

    assert.calledWithExactly(dmsControl.updateStatus, true)
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

    expect(manager.apiKey).to.be.eq(apiKey)
    expect(manager.apiSecret).to.be.eq(apiSecret)
    expect(manager.starting).to.be.false
  })
})

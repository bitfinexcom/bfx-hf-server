'use strict'

/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const proxyquire = require('proxyquire').noCallThru()
const { spy, assert, createSandbox } = require('sinon')
const { expect } = require('chai')

describe('ConnectionManager', () => {
  const sandbox = createSandbox()

  afterEach(() => {
    sandbox.reset()
  })

  const ws = {
    clients: {},
    algoWorker: {
      start: sandbox.stub()
    }
  }
  const db = sandbox.stub()
  const d = sandbox.stub()
  const apiKey = 'api key'
  const apiSecret = 'api secret'
  const wsURL = 'ws url'
  const restURL = 'rest url'
  const hostedURL = 'hosted url'
  const dmsScope = 'scope'

  const args = {
    ws,
    db,
    d,
    apiKey,
    apiSecret,
    wsURL,
    restURL,
    hostedURL,
    dmsScope
  }

  const dmsControl = {
    open: sandbox.stub(),
    updateStatus: sandbox.stub()
  }

  const DmsRemoteControl = spy((constructorArgs) => {
    expect(constructorArgs).to.be.eql({
      hostedURL,
      restURL,
      apiKey,
      apiSecret,
      dmsScope
    })
    return dmsControl
  })
  const openAuthBitfinexConnection = sandbox.stub()
  const getUserSettings = sandbox.stub()
  const bfxClient = sandbox.stub()

  beforeEach(() => {
    getUserSettings.resolves({ dms: true })
    dmsControl.open.resolves()
    openAuthBitfinexConnection.returns(bfxClient)
  })

  const manager = proxyquire('ws_servers/api/start_connections', {
    './dms_remote_control': DmsRemoteControl,
    './open_auth_bitfinex_connection': openAuthBitfinexConnection,
    '../../util/user_settings': getUserSettings
  })

  it('start', async () => {
    await manager.start(args)

    assert.calledWithExactly(getUserSettings, db)
    assert.notCalled(dmsControl.updateStatus)
    assert.calledWithExactly(dmsControl.open)

    assert.calledWithExactly(ws.algoWorker.start, { apiKey, apiSecret, userId: 'HF_User' })

    assert.calledWithExactly(openAuthBitfinexConnection, {
      ws,
      d,
      dms: false,
      apiKey,
      apiSecret,
      wsURL,
      restURL
    })
    expect(ws.clients).to.haveOwnProperty('bitfinex')

    expect(manager.apiKey).to.be.eq(apiKey)
    expect(manager.apiSecret).to.be.eq(apiSecret)
    expect(manager.starting).to.be.false
  })

  it('duplicated start', async () => {
    await manager.start(args)

    assert.calledWithExactly(dmsControl.updateStatus, true)
    assert.notCalled(dmsControl.open)
    assert.notCalled(ws.algoWorker.start)
    assert.notCalled(openAuthBitfinexConnection)
    expect(manager.starting).to.be.false
  })

  it('disable dms', async () => {
    getUserSettings.resolves({ dms: false })

    await manager.start(args)

    assert.calledWithExactly(dmsControl.updateStatus, false)
    assert.notCalled(dmsControl.open)
    assert.notCalled(ws.algoWorker.start)
    assert.notCalled(openAuthBitfinexConnection)
    expect(manager.starting).to.be.false
  })

  it('update credentials', async () => {
    const apiKey = 'new key'
    const apiSecret = 'new secret'
    await manager.start({
      ...args,
      apiKey,
      apiSecret
    })

    assert.calledWithExactly(getUserSettings, db)
    assert.calledWithExactly(dmsControl.updateStatus, true)
    assert.notCalled(dmsControl.open)

    assert.calledWithExactly(ws.algoWorker.start, { apiKey, apiSecret, userId: 'HF_User' })

    assert.calledWithExactly(openAuthBitfinexConnection, {
      ws,
      d,
      dms: false,
      apiKey,
      apiSecret,
      wsURL,
      restURL
    })
    expect(ws.clients).to.haveOwnProperty('bitfinex')

    expect(manager.apiKey).to.be.eq(apiKey)
    expect(manager.apiSecret).to.be.eq(apiSecret)
    expect(manager.starting).to.be.false
  })
})

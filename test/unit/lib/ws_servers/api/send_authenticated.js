/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { assert, createSandbox } = require('sinon')
const { expect } = require('chai')
const proxyquire = require('proxyquire')

const sandbox = createSandbox()
const stubWsSend = sandbox.stub()
const stubWsSendError = sandbox.stub()
const stubWsNotify = sandbox.stub()
const stubFilterMarketData = sandbox.stub()
const stubDecryptApiCreds = sandbox.stub()
const stubOpenAuthBfxConn = sandbox.stub()

const SendAuthenticated = proxyquire('ws_servers/api/send_authenticated', {
  '../../util/ws/send': stubWsSend,
  '../../util/ws/send_error': stubWsSendError,
  '../../util/ws/notify': { notifySuccess: stubWsNotify },
  '../../util/filter_market_data': stubFilterMarketData,
  '../../util/decrypt_api_credentials': stubDecryptApiCreds,
  './open_auth_bitfinex_connection': stubOpenAuthBfxConn
})

describe('send authenticated', () => {
  after(() => {
    sandbox.restore()
  })

  afterEach(() => {
    sandbox.reset()
  })

  const ws = {
    authPassword: 'secret',
    authControl: 'control',
    algoWorker: {
      start: sandbox.stub()
    },
    clients: {}
  }
  const db = {
    Credential: {
      find: sandbox.stub(),
      rm: sandbox.stub()
    }
  }
  const opts = { mode: 'paper' }
  const marketData = 'market data'
  const d = sandbox.stub()

  it('should send error if it is not authenticated', async () => {
    const ws = { authPassword: undefined, authControl: undefined }
    const markets = 'markets'
    stubFilterMarketData.returns(markets)

    await SendAuthenticated(ws, db, marketData, d, opts)

    assert.calledWith(stubFilterMarketData, marketData)
    assert.calledWithExactly(stubWsSend, ws, ['info.markets', 'bitfinex', markets])
    assert.calledWithExactly(stubWsSendError, ws, 'Not authenticated')
    assert.notCalled(db.Credential.find)
    assert.notCalled(stubDecryptApiCreds)
  })

  it('should abort if could not find credentials', async () => {
    db.Credential.find.resolves([undefined])

    await SendAuthenticated(ws, db, marketData, d, opts)

    assert.calledWith(stubFilterMarketData, marketData)
    assert.calledWithExactly(stubWsSend, ws, ['info.auth_token', ws.authControl])
    assert.calledWithExactly(stubWsNotify, ws, 'Authenticated')
    assert.calledWithExactly(db.Credential.find, [['mode', '=', opts.mode]])
    assert.notCalled(stubDecryptApiCreds)
  })

  it('should abort if password is invalid', async () => {
    const credentials = 'credentials'
    db.Credential.find.resolves([credentials])
    stubDecryptApiCreds.resolves(undefined)

    await SendAuthenticated(ws, db, marketData, d, opts)

    assert.calledOnce(db.Credential.find)
    assert.calledWithExactly(stubDecryptApiCreds, {
      password: ws.authPassword,
      credentials
    })
    assert.calledWithExactly(d, 'found stored credential encrypted with invalid password, deleting...')
    assert.calledWithExactly(db.Credential.rm, credentials)
    assert.notCalled(ws.algoWorker.start)
  })

  it('should start algo worker', async () => {
    const credentials = 'credentials'
    const key = 'key'
    const secret = 'secret'
    const client = 'bfx exchange connection'

    db.Credential.find.resolves([credentials])
    stubDecryptApiCreds.resolves({ key, secret })
    stubOpenAuthBfxConn.resolves(client)

    await SendAuthenticated(ws, db, marketData, d, opts)

    expect(ws.bitfinexCredentials).to.eql({ key, secret })
    assert.calledWithExactly(stubWsNotify, ws, 'Decrypted credentials for bitfinex (paper)')
    assert.calledWithExactly(stubWsSend, ws, ['data.api_credentials.configured', 'bitfinex'])
    assert.calledWithExactly(ws.algoWorker.start, { apiKey: key, apiSecret: secret, userId: 'HF_User' })
    assert.calledWithExactly(stubOpenAuthBfxConn, { ws, apiKey: key, apiSecret: secret, db, d, opts })
    expect(ws.clients.bitfinex).to.eq(client)
  })
})

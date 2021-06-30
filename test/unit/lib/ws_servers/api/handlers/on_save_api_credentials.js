/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { assert, createSandbox } = require('sinon')
const { expect } = require('chai')
const proxyquire = require('proxyquire')

const sandbox = createSandbox()
const stubWsSend = sandbox.stub()
const stubWsSendError = sandbox.stub()
const stubWsValidateParams = sandbox.stub()
const stubNotifyInternalError = sandbox.stub()
const stubNotifySuccess = sandbox.stub()
const stubNotifyError = sandbox.stub()
const stubVerifyPassword = sandbox.stub()
const stubEncryptApiCred = sandbox.stub()
const stubWsIsAuthorized = sandbox.stub()
const stubCaptureException = sandbox.stub()
const stubOpenAuthBfxConn = sandbox.stub()
const Handler = proxyquire('ws_servers/api/handlers/on_save_api_credentials', {
  '../../../util/ws/send': stubWsSend,
  '../../../util/ws/send_error': stubWsSendError,
  '../../../util/ws/validate_params': stubWsValidateParams,
  '../../../util/ws/notify': {
    notifyInternalError: stubNotifyInternalError,
    notifySuccess: stubNotifySuccess,
    notifyError: stubNotifyError
  },
  '../../../util/verify_password': stubVerifyPassword,
  '../../../util/encrypt_api_credentials': stubEncryptApiCred,
  '../../../util/ws/is_authorized': stubWsIsAuthorized,
  '../../../capture': { exception: stubCaptureException },
  '../open_auth_bitfinex_connection': stubOpenAuthBfxConn
})

describe('on save api credentials', () => {
  after(() => {
    sandbox.restore()
  })

  beforeEach(() => {
    stubWsValidateParams.returns(true)
    stubWsIsAuthorized.returns(true)
    stubVerifyPassword.resolves(ws.authControl)
  })

  afterEach(() => {
    sandbox.reset()
  })

  const server = {
    d: sandbox.stub(),
    db: {
      Credential: { set: sandbox.stub() }
    },
    wsURL: 'ws url',
    restURL: 'rest url',
    reconnectAlgoHost: sandbox.stub()
  }
  const ws = {
    authPassword: 'secret',
    authControl: 'auth control',
    clients: {
      bitfinex: {
        setAuthArgs: sandbox.stub(),
        reconnect: sandbox.stub()
      }
    },
    algoWorker: {
      start: sandbox.stub()
    }
  }
  const authToken = 'authToken'
  const apiKey = 'apiKey'
  const apiSecret = 'apiSecret'
  const formSent = 'paper'
  const mode = 'paper'
  const msg = [null, authToken, apiKey, apiSecret, formSent, mode]

  it('should abort if request is invalid', async () => {
    stubWsValidateParams.returns(false)

    await Handler(server, ws, msg)

    assert.calledWithExactly(stubWsValidateParams, ws, {
      authToken: { type: 'string', v: authToken },
      apiKey: { type: 'string', v: apiKey },
      apiSecret: { type: 'string', v: apiSecret },
      formSent: { type: 'string', v: formSent },
      mode: { type: 'string', v: mode }
    })
    assert.calledWithExactly(server.d, 'save credentials: invalid request')
    assert.notCalled(stubWsIsAuthorized)
  })

  it('should abort if not authorized', async () => {
    stubWsIsAuthorized.returns(false)

    await Handler(server, ws, msg)

    assert.calledWithExactly(stubWsIsAuthorized, ws, authToken)
    assert.calledWithExactly(stubWsSendError, ws, 'Unauthorized')
    assert.notCalled(stubVerifyPassword)
  })

  it('should abort if password is invalid', async () => {
    stubVerifyPassword.resolves()

    await Handler(server, ws, msg)

    assert.calledWithExactly(stubVerifyPassword, server.db, ws.authPassword)
    assert.calledWithExactly(stubNotifyError, ws, 'Invalid password')
    assert.notCalled(stubEncryptApiCred)
  })

  it('should abort if failed to verify password', async () => {
    const err = new Error()
    stubVerifyPassword.rejects(err)

    await Handler(server, ws, msg)

    assert.calledWithExactly(stubVerifyPassword, server.db, ws.authPassword)
    assert.notCalled(stubNotifyError)
    assert.calledWithExactly(stubCaptureException, err)
    assert.calledWithExactly(stubNotifyInternalError, ws)
    assert.notCalled(stubEncryptApiCred)
  })

  it('should abort if form sent is not equal to mode', async () => {
    const credentials = 'credentials'
    stubEncryptApiCred.resolves(credentials)

    const mode = null
    const msg = [null, authToken, apiKey, apiSecret, formSent, mode]
    await Handler(server, ws, msg)

    assert.calledWithExactly(stubEncryptApiCred, {
      exID: 'bitfinex' + formSent,
      password: ws.authPassword,
      key: apiKey,
      secret: apiSecret,
      mode: formSent
    })
    assert.calledWithExactly(server.db.Credential.set, credentials)
    assert.calledWithExactly(stubNotifySuccess, ws, 'Encrypted API credentials saved for Bitfinex')
    assert.calledWithExactly(stubWsSend, ws, ['data.api_credentials.configured', 'bitfinex'])
    assert.notCalled(server.reconnectAlgoHost)
  })

  it('should ignore if algo worker already started', async () => {
    ws.algoWorker.isStarted = true
    await Handler(server, ws, msg)

    expect(ws.bitfinexCredentials).to.eql({ key: apiKey, secret: apiSecret })
    assert.calledWithExactly(ws.clients.bitfinex.setAuthArgs, { apiKey, apiSecret })
    assert.calledWithExactly(ws.clients.bitfinex.reconnect)
    assert.calledWithExactly(server.reconnectAlgoHost, ws)
    assert.calledWithExactly(stubNotifySuccess, ws, 'Reconnecting with new credentials...')
    assert.notCalled(ws.algoWorker.start)
  })

  it('should start algo worker', async () => {
    ws.algoWorker.isStarted = false
    const client = 'bfx exchange connection'
    stubOpenAuthBfxConn.resolves(client)

    await Handler(server, ws, msg)

    assert.calledWithExactly(ws.algoWorker.start, { apiKey, apiSecret, userId: 'HF_User' })
    const { db, d, wsURL, restURL } = server
    assert.calledWithExactly(stubOpenAuthBfxConn, { ws, apiKey, apiSecret, db, d, opts: { wsURL, restURL }})
    expect(ws.clients.bitfinex).to.eql(client)
  })
})

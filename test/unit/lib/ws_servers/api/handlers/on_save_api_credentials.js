/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { assert, createSandbox } = require('sinon')
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
const stubStartConnections = sandbox.stub()
const stubValidateModes = sandbox.stub()
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
  '../start_connections': { start: stubStartConnections },
  '../validate_modes': stubValidateModes
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

  const dmsScope = 'web'
  const hostedURL = 'hosted url'
  const server = {
    d: sandbox.stub(),
    db: {
      Credential: { set: sandbox.stub() }
    },
    wsURL: 'ws url',
    restURL: 'rest url',
    reconnectAlgoHost: sandbox.stub(),
    hostedURL
  }
  const algoWorker = {
    updateAuthArgs: sandbox.stub()
  }
  const ws = {
    authPassword: 'secret',
    authControl: 'auth control',
    closeMode: sandbox.stub(),
    authenticateSession: sandbox.stub(),
    setCredentialsForMode: sandbox.stub()
  }
  const authToken = 'authToken'
  const apiKey = 'apiKey'
  const apiSecret = 'apiSecret'
  const formSent = 'paper'
  const mode = 'paper'
  const msg = [null, authToken, apiKey, apiSecret, formSent, mode, dmsScope]

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
    assert.calledWithExactly(stubNotifyError, ws, 'Invalid password', ['invalidPassword'])
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
    assert.calledWithExactly(
      stubNotifySuccess,
      ws,
      'Encrypted API credentials saved for Bitfinex',
      ['encryptedApiCredentialsSavedFor', { target: 'Bitfinex' }]
    )
    assert.calledWithExactly(stubWsSend, ws, ['data.api_credentials.configured', 'bitfinex'])
    assert.calledWithExactly(ws.setCredentialsForMode, formSent, apiKey, apiSecret)
    assert.notCalled(ws.authenticateSession)
    assert.notCalled(stubStartConnections)
  })

  it('should start algo worker', async () => {
    algoWorker.isStarted = false
    stubStartConnections.resolves()

    await Handler(server, ws, msg)

    assert.calledWithExactly(ws.closeMode, mode)
    assert.calledWithExactly(ws.authenticateSession, {
      apiKey,
      apiSecret,
      mode,
      dmsScope
    })
    assert.calledWithExactly(stubStartConnections, server, ws)
  })
})

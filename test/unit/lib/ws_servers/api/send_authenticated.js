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
const stubDecryptApiCreds = sandbox.stub()
const stubStartConnections = sandbox.stub()

const SendAuthenticated = proxyquire('ws_servers/api/send_authenticated', {
  '../../util/ws/send': stubWsSend,
  '../../util/ws/send_error': stubWsSendError,
  '../../util/ws/notify': { notifySuccess: stubWsNotify },
  '../../util/decrypt_api_credentials': stubDecryptApiCreds,
  './start_connections': { start: stubStartConnections }
})

describe('send authenticated', () => {
  after(() => {
    sandbox.restore()
  })

  afterEach(() => {
    sandbox.reset()
  })

  const db = {
    Credential: {
      find: sandbox.stub(),
      rm: sandbox.stub()
    },
    UserSettings: {
      getAll: sandbox.stub()
    }
  }
  const mode = 'paper'
  const wsURL = 'ws url'
  const restURL = 'rest url'
  const hostedURL = 'hosted url'
  const dmsScope = 'app'
  const apiKey = 'key'
  const apiSecret = 'secret'
  const opts = {
    mode,
    wsURL,
    restURL,
    hostedURL,
    dmsScope
  }
  const marketData = new Map()
  const d = sandbox.stub()
  const server = {
    d,
    db,
    marketData
  }
  const ws = {
    authPassword: 'secret',
    authControl: 'control',
    authenticateSession: (args) => {
      expect(args).to.be.eql({
        apiKey,
        apiSecret,
        mode,
        dmsScope
      })
    }
  }

  it('should send error if it is not authenticated', async () => {
    const ws = { authPassword: undefined, authControl: undefined }

    await SendAuthenticated(server, ws, opts)

    assert.calledWithExactly(stubWsSend, ws, ['info.markets', 'bitfinex', { sandboxMarkets: {}, liveMarkets: {} }])
    assert.calledWithExactly(stubWsSendError, ws, 'Not authenticated')
    assert.notCalled(db.Credential.find)
    assert.notCalled(stubDecryptApiCreds)
  })

  it('should abort if could not find credentials', async () => {
    db.Credential.find.resolves([undefined])

    await SendAuthenticated(server, ws, opts)

    assert.calledWithExactly(stubWsSend, ws, ['info.auth_token', ws.authControl, false])
    assert.calledWithExactly(stubWsNotify, ws, 'Authenticated', ['authenticated'])
    assert.calledWithExactly(db.Credential.find, [['mode', '=', opts.mode]])
    assert.notCalled(stubDecryptApiCreds)
  })

  it('should abort if password is invalid', async () => {
    const credentials = 'credentials'
    db.Credential.find.resolves([credentials])
    stubDecryptApiCreds.resolves(undefined)

    await SendAuthenticated(server, ws, opts)

    assert.calledOnce(db.Credential.find)
    assert.calledWithExactly(stubDecryptApiCreds, {
      password: ws.authPassword,
      credentials
    })
    assert.calledWithExactly(d, 'found stored credential encrypted with invalid password, deleting...')
    assert.calledWithExactly(db.Credential.rm, credentials)
  })

  it('should start algo worker', async () => {
    const credentials = 'credentials'

    db.Credential.find.resolves([credentials])
    db.UserSettings.getAll.resolves({ userSettings: null })
    stubDecryptApiCreds.resolves({ key: apiKey, secret: apiSecret })
    stubStartConnections.resolves()

    await SendAuthenticated(server, ws, opts)

    assert.calledWithExactly(
      stubWsNotify,
      ws,
      'Decrypted credentials for bitfinex (paper)',
      ['decryptedCredentialsFor', { target: 'Bitfinex', mode: 'paper' }]
    )
    assert.calledWithExactly(stubWsSend, ws, ['data.api_credentials.configured', 'bitfinex'])
    assert.calledWithExactly(stubStartConnections, server, ws)
  })
})

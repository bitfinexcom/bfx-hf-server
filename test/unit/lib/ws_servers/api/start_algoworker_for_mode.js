/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { assert, createSandbox } = require('sinon')
const { expect } = require('chai')
const proxyquire = require('proxyquire')

const sandbox = createSandbox()
const stubDecryptApiCreds = sandbox.stub()
const stubStartConnections = sandbox.stub()

const StartAlgoWorkerForMode = proxyquire('ws_servers/api/start_algoworker_for_mode', {
  '../../util/decrypt_api_credentials': stubDecryptApiCreds,
  './start_connections': { start: stubStartConnections }
})

describe('start algoworker for mode', () => {
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
  const d = sandbox.stub()
  const server = {
    d,
    db
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

    await StartAlgoWorkerForMode(server, ws, opts)

    assert.calledWithExactly(d, 'Not authenticated')
    assert.notCalled(db.Credential.find)
    assert.notCalled(stubDecryptApiCreds)
  })

  it('should abort if could not find credentials', async () => {
    db.Credential.find.resolves([undefined])

    await StartAlgoWorkerForMode(server, ws, opts)

    assert.calledWithExactly(db.Credential.find, [['mode', '=', opts.mode]])
    assert.notCalled(stubDecryptApiCreds)
  })

  it('should abort if password is invalid', async () => {
    const credentials = 'credentials'
    db.Credential.find.resolves([credentials])
    stubDecryptApiCreds.resolves(undefined)

    await StartAlgoWorkerForMode(server, ws, opts)

    assert.calledOnce(db.Credential.find)
    assert.calledWithExactly(stubDecryptApiCreds, {
      password: ws.authPassword,
      credentials
    })
    assert.calledWithExactly(db.Credential.rm, credentials)
  })

  it('should start algo worker', async () => {
    const credentials = 'credentials'

    db.Credential.find.resolves([credentials])
    db.UserSettings.getAll.resolves({ userSettings: null })
    stubDecryptApiCreds.resolves({ key: apiKey, secret: apiSecret })
    stubStartConnections.resolves([])

    await StartAlgoWorkerForMode(server, ws, opts)

    assert.calledWithExactly(stubStartConnections, server, ws)
  })
})

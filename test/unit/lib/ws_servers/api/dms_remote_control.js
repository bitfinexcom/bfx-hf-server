/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const proxyquire = require('proxyquire').noCallThru()
const { spy, assert, createSandbox } = require('sinon')
const { expect } = require('chai')
const EventEmitter = require('events')

describe('DmsRemoteControl', () => {
  const sandbox = createSandbox()
  const stubGenerateToken = sandbox.stub()
  const stubWsSend = sandbox.stub()
  const stubWsClose = sandbox.stub()

  const wsConn = new EventEmitter()
  wsConn.send = stubWsSend
  wsConn.close = stubWsClose

  afterEach(() => {
    sandbox.reset()
  })

  after(() => {
    sandbox.restore()
  })

  const hostedURL = 'hosted url'
  const restURL = 'rest url'
  const apiKey = 'api key'
  const apiSecret = 'api secret'
  const dmsScope = 'app'
  const token = 'auth token'

  const DmsRemoteControl = proxyquire('ws_servers/api/dms_remote_control', {
    ws: spy((url) => {
      expect(url).to.eq(hostedURL)
      return wsConn
    }),
    'bfx-api-node-rest': {
      RESTv2: spy((opts) => {
        expect(opts).to.eql({
          transform: true,
          url: restURL,
          apiKey: apiKey,
          apiSecret: apiSecret
        })

        return {
          generateToken: stubGenerateToken
        }
      })
    }
  })

  it('open', (done) => {
    sandbox.stub(Date, 'now').returns(0)
    stubGenerateToken.resolves([token])

    const dms = new DmsRemoteControl({
      hostedURL,
      restURL,
      apiKey,
      apiSecret,
      dmsScope
    })
    expect(dms.authToken).to.be.undefined

    const openPromise = dms.open()

    setImmediate(() => {
      wsConn.emit('open')
    })

    setTimeout(() => {
      assert.calledWithExactly(stubWsSend, JSON.stringify({
        event: 'auth',
        token,
        dms: true,
        dmsScope,
        noInteraction: true
      }))

      wsConn.emit('message', JSON.stringify(['auth.user_id']))
    }, 100)

    openPromise
      .then(() => {
        assert.calledWithExactly(stubGenerateToken, {
          scope: 'api',
          writePermission: true,
          ttl: 3600,
          caps: ['o']
        })
        expect(dms.authToken).to.eq(token)
        expect(dms.tokenExpiresAt).to.eq(60 * 60 * 1000)
        expect(dms.authTimeout._destroyed).to.be.true
        expect(dms.pingInterval).not.to.be.empty
      })
      .then(() => {
        dms.close()

        expect(dms.stopped).to.be.true
        expect(dms.pingInterval._destroyed).to.be.true
        assert.calledWithExactly(stubWsClose)

        done()
      })
  })

  describe('update status', () => {
    const dms = new DmsRemoteControl({
      hostedURL,
      restURL,
      apiKey,
      apiSecret,
      dmsScope
    })
    dms.ws = wsConn

    it('ignore if dms should remain active', () => {
      const active = true
      dms.updateStatus(active)

      assert.notCalled(stubWsSend)
    })

    it('should disable and close', () => {
      const active = false
      dms.updateStatus(active)

      assert.calledWithExactly(stubWsSend, JSON.stringify({
        event: 'disable_dms',
        scope: dmsScope
      }))
      expect(dms.stopped).to.be.true
      expect(dms.pingInterval).to.be.undefined
      assert.calledWithExactly(stubWsClose)
    })
  })
})

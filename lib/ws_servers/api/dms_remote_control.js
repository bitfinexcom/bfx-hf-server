'use strict'

const WebSocket = require('ws')
const flatPromise = require('flat-promise')

const maxWaitTime = 2 * 1000

class DmsRemoteControl {
  /**
   * @param {string} url
   * @param {RESTv2} rest
   */
  constructor ({ url, rest }) {
    this.url = url
    this.rest = rest
    this.ws = null
  }

  /**
   * @param {string} scope
   * @returns {Promise<void>}
   */
  async open (scope) {
    const token = await this._getAuthToken()
    return this._connectToWs(token, scope)
  }

  close () {
    if (this.ws) {
      this.ws.close()
    }
  }

  async _getAuthToken () {
    const [token] = await this.rest.generateToken({
      scope: 'api',
      writePermission: false,
      ttl: 60 * 60,
      caps: ['o']
    })
    return token
  }

  _connectToWs (token, scope) {
    let timeout
    const { promise, resolve, reject } = flatPromise()
    const authMessage = {
      event: 'auth',
      token,
      dms: true,
      dmsScope: scope,
      noInteraction: true
    }

    this.ws = new WebSocket(this.url)
    this.ws.on('open', () => {
      this.ws.send(JSON.stringify(authMessage))
      timeout = setTimeout(() => reject('auth timeout'), maxWaitTime)
    })
    this.ws.on('error', reject)
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(raw)

      if (Array.isArray(msg) && msg[0] === 'auth.user_id') {
        clearTimeout(timeout)
        resolve()
      }
    })

    return promise
  }
}

module.exports = DmsRemoteControl

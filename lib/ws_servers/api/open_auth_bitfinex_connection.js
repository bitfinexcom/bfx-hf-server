'use strict'

const _isObject = require('lodash/isObject')
const _isString = require('lodash/isString')
const _isEmpty = require('lodash/isEmpty')
const { _default: DEFAULT_SETTINGS } = require('bfx-hf-ui-config').UserSettings
const BitfinexExchangeConnection = require('../../exchange_clients/bitfinex')
const { notifyInfo, notifyError, notifySuccess } = require('../../util/ws/notify')
const send = require('../../util/ws/send')
const { WS_CONNECTION, DMS_ENABLED } = require('../../constants')

module.exports = async (conf) => {
  const { ws, apiKey, apiSecret, db, d, opts } = conf

  notifyInfo(ws, 'Connecting to Bitfinex...')

  const { wsURL, restURL } = opts
  const { UserSettings } = db
  const { userSettings: settings } = await UserSettings.getAll()
  const client = new BitfinexExchangeConnection({ wsURL, restURL })
  const { dms } = settings || DEFAULT_SETTINGS

  d('opening auth bfx connection (dms %s)', dms ? 'enabled' : 'disabled')

  client.setAuthArgs({ dms: dms ? DMS_ENABLED : 0 })
  client.openWS({
    apiKey,
    apiSecret
  })

  client.on('error', (err) => {
    notifyError(ws, `Bitfinex - ${err.message}`)
  })

  client.on('open', () => {
    notifyInfo(ws, 'Connected to Bitfinex')
  })

  client.on('auth', () => {
    notifySuccess(ws, 'Authenticated with Bitfinex')
    send(ws, ['data.client', 'bitfinex', WS_CONNECTION.OPENED])
  })

  client.on('close', () => {
    notifyInfo(ws, 'Disconnected from Bitfinex')
    send(ws, ['data.client', 'bitfinex', WS_CONNECTION.CLOSED])
  })

  client.onData(payload => {
    const [msgType, msgData] = payload

    switch (msgType) {
      case 'ws': return send(ws, ['data.balances', 'bitfinex', msgData])
      case 'wu': return send(ws, ['data.balance', 'bitfinex', msgData])
      case 'ps': return send(ws, ['data.positions', 'bitfinex', msgData])
      case 'pu': return send(ws, ['data.position', 'bitfinex', msgData])
      case 'pc': return send(ws, ['data.position.close', 'bitfinex', msgData])
      case 'os': return send(ws, ['data.orders', 'bitfinex', msgData])
      case 'on':
      case 'ou': return send(ws, ['data.order', 'bitfinex', msgData])
      case 'oc': return send(ws, ['data.order.close', 'bitfinex', msgData])
      case 'n': {
        let [,,,, ucmPayload,, status, text] = msgData

        // The payload is fluid and can have any format; HF uses level & message
        if (_isObject(ucmPayload) && !_isEmpty(ucmPayload)) {
          status = ucmPayload.level || ucmPayload.type || ucmPayload.status
          text = ucmPayload.message || ucmPayload.msg || ucmPayload.text
        }

        if (_isString(status) && _isString(text) && !_isEmpty(status) && !_isEmpty(text)) {
          if (status.toLowerCase() === 'success') {
            notifySuccess(ws, text)
          } else if (status.toLowerCase() === 'info') {
            notifyInfo(ws, text)
          } else if (status.toLowerCase() === 'error') {
            notifyError(ws, text)
          }
        }

        break
      }
    }
  })

  send(ws, ['data.client', 'bitfinex', WS_CONNECTION.CONNECTING])

  client.openSocket()

  return client
}

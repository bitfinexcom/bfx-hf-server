'use strict'

const { DEFAULT_USER } = require('../../constants')

const DmsRemoteControl = require('./dms_remote_control')
const openAuthBitfinexConnection = require('./open_auth_bitfinex_connection')
const getUserSettings = require('../../util/user_settings')

module.exports = async ({ ws, db, d, apiKey, apiSecret, wsURL, restURL, hostedURL, dmsScope }) => {
  const { dms } = await getUserSettings(db)

  if (dms && dmsScope) {
    ws.dmsControl = new DmsRemoteControl({
      hostedURL,
      restURL,
      apiKey,
      apiSecret
    })
    await ws.dmsControl.open(dmsScope)
  }

  // for algo orders
  await ws.algoWorker.start({
    apiKey,
    apiSecret,
    userId: DEFAULT_USER
  })

  // for atomic orders
  ws.clients.bitfinex = openAuthBitfinexConnection({
    ws,
    apiKey,
    apiSecret,
    dms,
    d,
    wsURL,
    restURL
  })
}

'use strict'

const send = require('../../../util/ws/send')
const { notifyInfo } = require('../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const { Credential, Strategy, UserSettings } = db

  await Credential.rmAll()
  await Strategy.rmAll()
  await UserSettings.rmAll()

  send(ws, ['info.auth_configured', false])
  send(ws, ['info.auth_token', null])

  notifyInfo(ws, 'Cleared user credentials & data')
  d('reset user credentials')
}

'use strict'

const send = require('../../../util/ws/send')
const { notifyInfo } = require('../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { d, db, algoDB, strategyExecutionDB } = server
  const { Credential, Strategy, UserSettings, FavouriteTradingPairs, AlgoOrderParams } = db
  const { StrategyExecution } = strategyExecutionDB
  const { AlgoOrder } = algoDB

  await Promise.all([
    AlgoOrder.rmAll(),
    Credential.rmAll(),
    Strategy.rmAll(),
    UserSettings.rmAll(),
    FavouriteTradingPairs.rmAll(),
    AlgoOrderParams.rmAll(),
    StrategyExecution.rmAll()
  ])

  send(ws, ['info.auth_configured', false])
  send(ws, ['info.auth_token', null])

  notifyInfo(ws, 'Cleared user credentials & data', ['clearedUserCredentialsAndData'])
  d('reset user credentials')
}

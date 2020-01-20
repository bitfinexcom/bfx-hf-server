'use strict'

const PI = require('p-iteration')
const send = require('../../util/ws/send')
const { notifyInternalError } = require('../../util/ws/notify')
const decryptStrategy = require('../../util/decrypt_strategy')
const capture = require('../../capture')

module.exports = async (ws, db, d) => {
  if (!ws.authPassword) return

  const { Strategy } = db
  let strategiesByID

  try {
    strategiesByID = await Strategy.getAll()
  } catch (e) {
    capture.exception(e)
    notifyInternalError(ws)
    return
  }

  const decryptedStrategies = []

  await PI.forEach(Object.values(strategiesByID), async (encryptedStrategy) => {
    const { id } = encryptedStrategy
    let strategy

    try {
      strategy = await decryptStrategy(encryptedStrategy, ws.authPassword)
    } catch (e) {
      capture.exception(e)
      notifyInternalError(ws)
      return
    }

    if (!strategy) {
      d('strategy encrypted with different password, deleting: %s', id)
      await Strategy.rm(encryptedStrategy)
    } else {
      decryptedStrategies.push(strategy)
    }
  })

  send(ws, ['data.strategies', decryptedStrategies])
}

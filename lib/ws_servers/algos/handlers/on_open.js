'use strict'

const _capitalize = require('lodash/capitalize')
const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')

const getHostKey = require('../util/get_host_key')
const spawnBitfinexAOHost = require('../spawn_bitfinex_ao_host')
const spawnBinanceAOHost = require('../spawn_binance_ao_host')

module.exports = async (server, ws, msg) => {
  const { d, hosts } = server
  const [, userID, exID, apiKey, apiSecret] = msg
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    userID: { type: 'string', v: userID },
    apiKey: { type: 'string', v: apiKey },
    apiSecret: { type: 'string', v: apiSecret }
  })

  if (!validRequest) {
    return
  } else if (exID !== 'bitfinex' && exID !== 'binance') {
    return sendError(ws, 'Only Bitfinex and Binance are currently supported for algo orders')
  } else if (!ws.userID) {
    return sendError(ws, 'Not identified')
  } else if (ws.userID !== userID) {
    d('tried to open host for user that differs from ws ident (%s)', userID)
    return sendError(ws, 'Unauthorised')
  }

  const key = getHostKey(userID, exID)
  const existingHost = hosts[key]

  if (existingHost) {
    return // sendError(ws, `Algo order host already open for user on ${exID}`)
  }

  switch (exID) {
    case 'bitfinex': {
      hosts[key] = await spawnBitfinexAOHost(server, apiKey, apiSecret)
      break
    }

    case 'binance': {
      hosts[key] = await spawnBinanceAOHost(server, apiKey, apiSecret)
      break
    }

    default: {
      d('Unknown exchange broke through: %s', exID)
      return sendError(ws, `Unknown exchange: ${exID}`)
    }
  }

  d('spawned host for user %s on exchange %s', userID, exID)

  hosts[key].on('error', (error) => {
    server.broadcast(userID, ['error', `${_capitalize(exID)} error: ${error}`])
  })

  hosts[key].on('ao:start', (instance) => {
    const { state = {} } = instance
    const { name, label, args, gid } = state

    d('ao started: %s %s', name, label)
    server.broadcast(userID, ['started', userID, exID, name, label, gid, args])
  })

  hosts[key].on('ao:stop', (instance) => {
    const { state = {} } = instance
    const { gid } = state

    d('ao stopped: %s', gid)
    server.broadcast(userID, ['stopped', userID, exID, gid])
  })

  send(ws, ['opened', userID, exID])
}

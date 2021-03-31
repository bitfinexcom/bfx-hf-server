'use strict'

const _capitalize = require('lodash/capitalize')
const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')

const getHostKey = require('../util/get_host_key')
const spawnBitfinexAOHost = require('../spawn_bitfinex_ao_host')

module.exports = async (server, ws, msg) => {
  const { d, hosts, algoDB } = server

  const [, userID, exID, apiKey, apiSecret] = msg
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    userID: { type: 'string', v: userID },
    apiKey: { type: 'string', v: apiKey },
    apiSecret: { type: 'string', v: apiSecret }
  })

  if (!validRequest) {
    return
  } else if (exID !== 'bitfinex') {
    return sendError(ws, 'Only Bitfinex is currently supported for algo orders')
  } else if (!ws.userID) {
    return sendError(ws, 'Not identified')
  } else if (ws.userID !== userID) {
    d('tried to open host for user that differs from ws ident (%s)', userID)
    return sendError(ws, 'Unauthorised')
  }

  const key = getHostKey(userID, exID)
  const existingHost = hosts[key]

  // FIXME: move algo-server and client into bfx-hf-server
  if (existingHost) {
    d('shutting down old algo host')
    existingHost.removeAllListeners()
    existingHost.close()
    existingHost.cleanState()

    delete hosts[key]
  }

  try {
    hosts[key] = await spawnBitfinexAOHost(server, apiKey, apiSecret)
  } catch (e) {
    d('algo host not opened, wrong api keys?')
    return
  }

  d('spawned host for user %s on exchange %s', userID, exID)

  hosts[key].on('error', (error) => {
    d('ao error: %o', error)

    if ((error && error.msg) || (error && error.message)) {
      error = error.msg || error.message
    }

    server.broadcast(userID, ['error', `${_capitalize(exID)} error: ${error}`])
  })

  hosts[key].on('ao:start', (instance) => {
    const { state = {} } = instance
    const { name, label, args, gid } = state

    d('ao started: %s %s', name, label)
    server.broadcast(userID, ['started', userID, exID, name, label, gid, args])
  })

  hosts[key].on('ao:loaded', (gid) => {
    d('ao loaded: %s', gid)
    server.broadcast(userID, ['loaded', userID, gid])
  })

  hosts[key].on('meta:reload', async () => {
    d('meta reloaded')
    server.broadcast(userID, ['reloaded', userID])
  })

  hosts[key].on('ao:stop', (instance) => {
    const { state = {} } = instance
    const { gid } = state

    d('ao stopped: %s', gid)
    server.broadcast(userID, ['stopped', userID, exID, gid])
  })

  hosts[key].on('ao:persist:db:update', async (updateOpts) => {
    const { AlgoOrder } = algoDB
    await AlgoOrder.set(updateOpts)
    d('ao instance updated %s', updateOpts.gid)
  })

  send(ws, ['opened', userID, exID])

  const host = hosts[key]

  const instances = host.getAOInstances()
  const activeInstances = instances.filter((aoInstance) => {
    const { state = {} } = aoInstance
    const { active } = state
    return active
  })

  if (activeInstances.length === 0) {
    return
  }

  send(ws, ['data.aos', exID, activeInstances.map((aoInstance) => {
    const { state = {} } = aoInstance
    const { gid, name, args, label } = state
    return [gid, name, label, args]
  })])
}

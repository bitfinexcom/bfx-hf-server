'use strict'

const getHostKey = require('../util/get_host_key')

module.exports = async (server, ws, msg) => {
  const { d, hosts } = server
  const [, userID, exID] = msg

  const key = getHostKey(userID, exID)
  const existingHost = hosts[key]

  if (existingHost) {
    d('shutting down old algo host')
    existingHost.removeAllListeners()
    existingHost.close()
    existingHost.cleanState()

    delete hosts[key]
  }
}

'use strict'

module.exports = (server, ws) => {
  const { d } = server
  const hosts = Object.values(server.hosts)

  hosts.forEach(h => h.reconnect())

  d('issued reconnect on all algo hosts')
}

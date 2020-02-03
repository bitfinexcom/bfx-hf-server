'use strict'

module.exports = async (server, ws) => {
  const { pool } = server
  const { exchangeClients } = pool

  Object.values(exchangeClients).forEach((ex) => {
    ex.reconnect()
  })
}

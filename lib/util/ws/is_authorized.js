'use strict'

module.exports = (ws, authToken) => (
  ws.authPassword && ws.authControl && ws.authControl === authToken
)

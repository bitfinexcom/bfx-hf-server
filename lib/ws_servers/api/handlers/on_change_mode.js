const sendAuthenticated = require('../send_authenticated')

module.exports = async (server, ws, msg) => {
  const [, mode, dmsScope] = msg

  if (ws.mode === mode) {
    return
  }

  const { d, db, marketData, wsURL, restURL, hostedURL } = server

  await sendAuthenticated(server, ws, db, marketData, d, { wsURL, restURL, hostedURL, mode, dmsScope })
}

const sendAuthenticated = require('../send_authenticated')

module.exports = async (server, ws, msg) => {
  const [, mode, dmsScope] = msg

  if (ws.mode === mode) {
    return
  }

  await sendAuthenticated(server, ws, { mode, dmsScope })
}

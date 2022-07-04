const sendAuthenticated = require('../send_authenticated')
const sendError = require('../../../util/ws/send_error')

module.exports = async (server, ws, msg) => {
  const [, mode, dmsScope] = msg

  if (!ws.mode) {
    sendError(ws, 'session mode not defined')
    return
  }

  if (ws.mode === mode) {
    return
  }

  await sendAuthenticated(server, ws, { mode, dmsScope })
}

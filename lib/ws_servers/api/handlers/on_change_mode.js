const sendAuthenticated = require('../send_authenticated')
const sendDataAgain = require('../send_data_again')
const sendError = require('../../../util/ws/send_error')

module.exports = async (server, ws, msg) => {
  const [, dmsScope] = msg

  if (!ws.mode) {
    sendError(ws, 'session mode not defined')
    return
  }

  const mode = ws.mode === 'main' ? 'paper' : 'main'

  await sendAuthenticated(server, ws, { mode, dmsScope })

  // TODO: send only if conn is not new
  await sendDataAgain(ws)
}

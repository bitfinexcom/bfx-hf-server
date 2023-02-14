const sendAuthenticated = require('../send_authenticated')
const sendRecurringAlgoOrderList = require('../send_recurring_algo_order_list')

module.exports = async (server, ws, msg) => {
  const [, mode, dmsScope] = msg

  if (ws.mode === mode) {
    return
  }

  await sendAuthenticated(server, ws, { mode, dmsScope })
  await sendRecurringAlgoOrderList(server, ws, mode)
}

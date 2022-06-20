const { dataHasValidCurrency } = require('../paper_filters')
const send = require('../../../util/ws/send')

module.exports = (ws, isPaper, data) => {
  if (!dataHasValidCurrency(isPaper, data)) return
  return send(ws, ['data.balance', 'bitfinex', data])
}

const { dataHasValidCurrency } = require('../paper_filters')
const send = require('../../../util/ws/send')

module.exports = (ws, isPaper, data) => {
  const filteredData = data.filter(item => dataHasValidCurrency(isPaper, item))
  return send(ws, ['data.balances', 'bitfinex', filteredData])
}

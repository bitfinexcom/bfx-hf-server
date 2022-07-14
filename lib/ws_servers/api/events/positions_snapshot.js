const { dataHasValidPair } = require('../paper_filters')
const send = require('../../../util/ws/send')

module.exports = (ws, isPaper, data) => {
  const filteredData = data.filter(item => dataHasValidPair(isPaper, item))
  return send(ws, ['data.positions', 'bitfinex', filteredData])
}

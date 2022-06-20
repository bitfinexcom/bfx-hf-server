const { dataHasValidPair } = require('../paper_filters')
const send = require('../../../util/ws/send')

module.exports = (ws, isPaper, data) => {
  if (!dataHasValidPair(isPaper, data)) return
  return send(ws, ['data.position', 'bitfinex', data])
}

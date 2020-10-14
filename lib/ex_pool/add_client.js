'use strict'

const capture = require('../capture')
const validExchange = require('../util/valid_exchange')
const propagateData = require('./propagate_data')
const getAdapter = require('./get_adapter')

/**
 * @param {Object} pool - exchange pool state
 * @param {string} exID - exchange ID
 * @return {boolean} success
 */
module.exports = (pool, exID, opts) => {
  const { d, exchangeClients } = pool
  const { wsURL, restURL } = opts

  if (!validExchange(exID)) {
    capture.exception('can\'t add unknown exchange: %s', exID)
    return false
  }

  const EXA = getAdapter(exID)
  const ex = new EXA({ wsURL, restURL })

  if (ex.openWS) {
    ex.openWS()
  }

  ex.onData((chanID, data) => {
    propagateData(pool, exID, chanID, data)
  })

  exchangeClients[exID] = ex
  d('added exchange %s to pool', exID)

  return ex
}

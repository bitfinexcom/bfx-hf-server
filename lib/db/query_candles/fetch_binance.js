'use strict'

const binanceTFToString = require('../../exchange_clients/binance/util/tf_to_string')
const fetch = require('./fetch')

module.exports = async ({
  market, tf, start, end, limit, order = 'asc', orderBy = 'mts'
}) => {
  return fetch({
    table: `binance_candles_${binanceTFToString(tf)}`,
    market,
    start,
    end,
    limit,
    order,
    orderBy
  })
}

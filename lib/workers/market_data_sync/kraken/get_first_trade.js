'use strict'

const dbRL = require('../../../db/pg_rate_limited')

module.exports = async (symbol) => {
  return dbRL((db) => {
    return db('kraken_trades')
      .where('symbol', symbol)
      .orderBy('mts', 'desc')
      .first('*')
  })
}

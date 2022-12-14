'use strict'

const { transformOrder } = require('./transformers/order')
const transformBalance = require('./transformers/balance')

module.exports = (type, data) => {
  switch (type) {
    case 'ws': return data.map(transformBalance)
    case 'wu': return transformBalance(data)
    case 'os': return data.map(transformOrder)
    default: return data
  }
}

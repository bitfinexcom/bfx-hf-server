const { PAPER_MODE_CURRENCIES } = require('../../constants')
const _isPlainObject = require('lodash/isPlainObject')
const isPaperPair = require('../../util/is_paper_pair')

const isValidPair = (isPaper, symbol) => {
  return !isPaper || isPaperPair(symbol)
}

const dataHasValidPair = (isPaper, [pair]) => {
  return !isPaper || isPaperPair(pair)
}

const dataHasValidCurrency = (isPaper, [curr]) => {
  return !isPaper || PAPER_MODE_CURRENCIES.has(curr)
}

const orderHasValidPair = (isPaper, { symbol }) => {
  return isValidPair(isPaper, symbol)
}

const orderHasValidScope = (order, dmsScope = 'app') => {
  return _isPlainObject(order.meta) && order.meta.scope === dmsScope
}

module.exports = {
  isValidPair,
  dataHasValidCurrency,
  dataHasValidPair,
  orderHasValidPair,
  orderHasValidScope
}

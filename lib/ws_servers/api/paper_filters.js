const { PAPER_MODE_PAIRS, PAPER_MODE_CURRENCIES } = require('../../constants')

const isValidPair = (isPaper, symbol) => {
  return !isPaper || PAPER_MODE_PAIRS.includes(symbol)
}

const dataHasValidPair = (isPaper, [pair]) => {
  return !isPaper || PAPER_MODE_PAIRS.includes(pair)
}

const dataHasValidCurrency = (isPaper, [curr]) => {
  return !isPaper || PAPER_MODE_CURRENCIES.has(curr)
}

const orderHasValidPair = (isPaper, { symbol }) => {
  return isValidPair(isPaper, symbol)
}

module.exports = {
  isValidPair,
  dataHasValidCurrency,
  dataHasValidPair,
  orderHasValidPair
}

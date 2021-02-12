'use strict'

const _includes = require('lodash/includes')

/**
 * @param {Array[]} - [exchangeSymbols, marginSymbols]
 * @param {string} - symbol
 * @return {Object} - market
 */
module.exports = (symbolsByContext, sym, lc) => {
  const c = []

  if (_includes(symbolsByContext[0], sym)) {
    c.push('e')
  }

  if (_includes(symbolsByContext[1], sym)) {
    c.push('m')
  }

  if (_includes(symbolsByContext[2], sym)) {
    c.push('f')
  }

  const b = sym.match(/:/) ? sym.split(':')[0] : sym.substring(0, 3)
  const q = sym.match(/:/) ? sym.split(':')[1] : sym.substring(3)
  const l = lc.get(sym) || 0

  return {
    l,
    c,
    b,
    q,
    u: `${b}/${q}`,
    r: `t${sym}`,
    w: `t${sym}`
  }
}

'use strict'

const _uniq = require('lodash/uniq')
const _flatten = require('lodash/flatten')
const { RESTv2 } = require('bfx-api-node-rest')
const symbolTransformer = require('./transformers/symbol')
const filterPairs = require('./util/filter_pairs.js')
const rest = new RESTv2()

module.exports = async () => {
  const pairs = rest.conf([
    'pub:list:pair:exchange',
    'pub:list:pair:margin',
    'pub:list:pair:futures'
  ])

  const pairsToExclude = rest.conf([
    'pub:list:currency:paper'
  ])

  const [res, pp] = await Promise.all([pairs, pairsToExclude])
  const symbols = _uniq(_flatten(_flatten(res)))
  const exclude = _flatten(pp)

  const sf = filterPairs(symbols, exclude)

  return sf.map((sym) => symbolTransformer(res, sym))
}

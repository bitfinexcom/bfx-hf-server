'use strict'

const _uniq = require('lodash/uniq')
const _flatten = require('lodash/flatten')
const { RESTv2 } = require('bfx-api-node-rest')
const symbolTransformer = require('./transformers/symbol')
const filterPairs = require('./util/filter_pairs.js')
const getMaxLevForPairs = require('./util/get_max_lev_for_pairs')
const rest = new RESTv2()

module.exports = async () => {
  const pairs = rest.conf([
    'pub:list:pair:exchange',
    'pub:list:pair:margin',
    'pub:list:pair:futures'
  ])

  const pairsToExclude = rest.conf([
    'pub:list:currency:paper',
    'pub:list:currency:viewonly'
  ])

  const levSupportedPairs = rest.conf([
    'pub:spec:futures',
    'pub:spec:margin'
  ])

  const [res, pe, lc] = await Promise.all([pairs, pairsToExclude, levSupportedPairs])

  const symbols = _uniq(_flatten(_flatten(res)))
  const exclude = _flatten(pe)
  const lp = getMaxLevForPairs(lc)

  const sf = filterPairs(symbols, exclude, false)
  const main = sf.map((sym) => symbolTransformer(res, sym, lp, { paper: false }))

  const prefilteredPaper = filterPairs(symbols, pe[1], false)
  const onlyPaperPairs = filterPairs(prefilteredPaper, pe[0], true)
  const paper = onlyPaperPairs.map((sym) => symbolTransformer(res, sym, lp, { paper: true }))

  return _flatten([main, paper])
}

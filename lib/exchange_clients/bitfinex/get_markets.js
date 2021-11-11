'use strict'

const _uniq = require('lodash/uniq')
const _flatten = require('lodash/flatten')
const symbolTransformer = require('./transformers/symbol')
const filterPairs = require('./util/filter_pairs.js')
const getMaxLevForPairs = require('./util/get_max_lev_for_pairs')
const getMinMaxSizeForPairs = require('./util/get_min_max_size_for_pairs')

module.exports = async (rest) => {
  const pairDetails = await rest.conf([
    'pub:list:pair:exchange', // pairs
    'pub:list:pair:margin', // pairs
    'pub:list:pair:futures', // pairs
    'pub:list:currency:paper', // pairs to exclude
    'pub:list:currency:viewonly', // pairs to exclude
    'pub:spec:futures', // lev supported pairs
    'pub:spec:margin', // lev supported pairs
    'pub:info:pair', // pairInfo
    'pub:info:pair:futures' // pairInfo
  ])

  const allPairs = pairDetails.splice(0, 3)
  const pairsToExclude = pairDetails.splice(0, 2)
  const levSupportedPairs = pairDetails.splice(0, 2)
  const pairInfo = pairDetails

  const symbols = _uniq(_flatten(allPairs))
  const exclude = _flatten(pairsToExclude)
  const lp = getMaxLevForPairs(levSupportedPairs)
  const cp = getMinMaxSizeForPairs(pairInfo)

  const sf = filterPairs(symbols, exclude, false)
  const main = sf.map((sym) => symbolTransformer(allPairs, sym, lp, cp, { paper: false }))

  const prefilteredPaper = filterPairs(symbols, pairsToExclude[1], false)
  const onlyPaperPairs = filterPairs(prefilteredPaper, pairsToExclude[0], true)
  const paper = onlyPaperPairs.map((sym) => symbolTransformer(allPairs, sym, lp, cp, { paper: true }))

  return _flatten([main, paper])
}

'use strict'

const _uniq = require('lodash/uniq')
const _flatten = require('lodash/flatten')
const { RESTv2 } = require('bfx-api-node-rest')
const symbolTransformer = require('./transformers/symbol')
const rest = new RESTv2()

module.exports = () => {
  return rest.conf([
    'pub:list:pair:exchange',
    'pub:list:pair:margin',
    'pub:list:pair:futures'
  ]).then(res => {
    const symbols = _uniq(_flatten(_flatten(res)))
    return symbols.map((sym) => symbolTransformer(res, sym))
  })
}

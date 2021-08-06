'use strict'

const _flatten = require('lodash/flatten')
const _capitalize = require('lodash/capitalize')

module.exports = (message) => {
  const [first, ...rest] = message

  return _flatten([
    _capitalize(first), ...rest
  ]).filter(t => !!t).join(' ')
}

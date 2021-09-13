'use strict'

function apply (params) {
  if (!params) return undefined
  if ('key' in params) return params
  return { key: params[0], props: params[1] }
}

module.exports = {
  apply
}

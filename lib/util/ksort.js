'use strict'

module.exports = (obj) => {
  const keys = Object.keys(obj).sort()
  const sortedObj = {}

  for (const i in keys) {
    sortedObj[keys[i]] = obj[keys[i]]
  }

  return sortedObj
}

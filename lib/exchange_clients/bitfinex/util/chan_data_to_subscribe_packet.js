'use strict'

module.exports = (chanData = []) => {
  const [type] = chanData

  switch (type) {
    case 'trades': { // ['trades', 'tEOSUSD']
      return chanData[1].wsID
    }

    case 'book': { // ['book', 'tEOSUSD']
      return [chanData[1].wsID, 'P0', '25'] // prec/len hardcoded for cross-compat
    }

    default: {
      return null
    }
  }
}

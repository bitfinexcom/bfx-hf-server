'use strict'

module.exports = (chanData = []) => {
  const [type] = chanData

  switch (type) {
    case 'trades': { // ['trades', 'tEOSUSD']
      return chanData[1].wsID
    }

    default: {
      return null
    }
  }
}

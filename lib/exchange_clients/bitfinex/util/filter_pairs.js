'use strict'

module.exports = function filterPairs (symbols, exclude) {
  const sf = symbols.filter((el) => {
    let include = true

    for (let i = 0; i < exclude.length; i++) {
      const p = exclude[i]
      if (el.startsWith(p) || el.endsWith(p)) {
        include = false
        break
      }
    }

    return include
  })

  return sf
}

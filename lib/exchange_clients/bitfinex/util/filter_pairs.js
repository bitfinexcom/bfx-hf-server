'use strict'

module.exports = function filterPairs (symbols, exclude, reverse = false) {
  const sf = symbols.filter((el) => {
    let include = reverse === false

    for (let i = 0; i < exclude.length; i++) {
      const p = exclude[i]
      if (el.startsWith(p) || el.endsWith(p)) {
        include = reverse !== false
        break
      }
    }

    return include
  })

  return sf
}

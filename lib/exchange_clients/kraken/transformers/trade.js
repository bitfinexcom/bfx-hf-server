'use strict'

module.exports = (u = []) => ({
  price: +u[0],
  amount: +u[1] * (u[3] === 's' ? -1 : 1),
  mts: Math.floor(+u[2])
})

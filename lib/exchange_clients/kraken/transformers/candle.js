'use strict'

module.exports = (u = [], rest) => ({
  open: +u[rest ? 1 : 2],
  high: +u[rest ? 2 : 3],
  low: +u[rest ? 3 : 4],
  close: +u[rest ? 4 : 5],
  volume: +u[rest ? 6 : 7],
  mts: rest ? +u[0] : Math.floor(+u[1] * 1000)
})

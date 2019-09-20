'use strict'

module.exports = (u = {}) => ({
  bid: u.b[0],
  ask: u.a[0],
  dailyChange: u.p[0] - u.p[1],
  dailyChangePerc: (u.p[0] / u.p[1]) / (u.p[0] > u.p[1] ? 100 : -100),
  lastPrice: u.c[0],
  volume: u.v[1],
  high: u.h[0],
  low: u.l[0]
})

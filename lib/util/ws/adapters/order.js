'use strict'

module.exports = (data = []) => ({
  id: data[0],
  gid: data[1],
  cid: data[2],
  symbol: data[3],
  created: data[4],
  amount: data[5],
  originalAmount: data[6],
  type: data[7],
  tif: data[8],
  status: data[9],
  price: data[10],
  priceAvg: data[11],
  priceTrailing: data[12],
  priceAuxLimit: data[13],
  hidden: data[14],
  postonly: data[15],
  oco: data[16],
  reduceonly: data[17],
  visibleOnHit: data[18],
  lev: data[19],
  meta: data[20],
  updated: data[21]
})

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
  status: data[8],
  price: data[9]
})

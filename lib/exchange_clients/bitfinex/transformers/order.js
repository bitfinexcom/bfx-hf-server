'use strict'

const OrderFlags = {
  OCO: 2 ** 14, // 16384
  REDUCE_ONLY: 2 ** 10 // 1024
}

const fillWithFlags = (order) => {
  const { flags, meta, hidden } = order

  return {
    ...order,
    postonly: Boolean(meta && meta.$F7),
    oco: !!(flags & OrderFlags.OCO),
    reduceonly: !!(flags & OrderFlags.REDUCE_ONLY),
    visibleOnHit: !!(hidden && meta && meta.make_visible),
    lev: (meta && meta.lev) || null
  }
}

const transformOrder = (data = []) => {
  return fillWithFlags({
    id: data[0],
    gid: data[1],
    cid: data[2],
    symbol: data[3],
    mtsCreate: data[4],
    mtsUpdate: data[5],
    amount: data[6],
    amountOrig: data[7],
    type: data[8],
    mtsTIF: data[10],
    flags: data[12],
    status: data[13],
    price: data[16],
    priceAvg: data[17],
    priceTrailing: data[18],
    priceAuxLimit: data[19],
    hidden: Boolean(data[24]),
    meta: data[31]
  })
}

module.exports = {
  transformOrder,
  fillWithFlags
}

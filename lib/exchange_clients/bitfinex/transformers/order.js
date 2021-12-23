'use strict'

const OrderFlags = {
  OCO: 2 ** 14, // 16384
  POSTONLY: 2 ** 12, // 4096
  REDUCE_ONLY: 2 ** 10 // 1024
}

const checkHeaderFlags = (flags, meta, hidden) => {
  return {
    postonly: !!(flags & OrderFlags.POSTONLY),
    oco: !!(flags & OrderFlags.OCO),
    reduceonly: !!(flags & OrderFlags.REDUCE_ONLY),
    visibleOnHit: !!(hidden && meta && meta.make_visible),
    lev: (meta && meta.lev) || null
  }
}

module.exports = (o = []) => {
  const {
    postonly, oco, reduceonly, visibleOnHit, lev
  } = checkHeaderFlags(o[12], o[31], o[24]) // flags, meta, hidden

  return [
    o[0], // id
    o[1], // gid
    o[2], // cid
    o[3], // symbol
    o[4], // created
    o[6], // amount
    o[7], // original amount
    o[8], // type
    o[10], // mts_tif
    o[13], // status
    o[16], // price
    o[17], // price_avg
    o[18], // price_trailing
    o[19], // price_aux_limit
    Boolean(o[24]), // hidden
    postonly,
    oco,
    reduceonly,
    visibleOnHit,
    lev
  ]
}

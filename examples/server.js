'use strict'

process.env.DEBUG = 'bfx:hf:*'

const startHFServer = require('..')

startHFServer({
  uiDBPath: `${__dirname}/../db/ui.json`,
  algoDBPath: `${__dirname}/../db/algos.json`,
  hfBitfinexDBPath: `${__dirname}/../db/hf-bitfinex.json`
  // bfxRestURL: '',
  // bfxWSURL: ''
})

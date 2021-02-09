'use strict'

const os = require('os')

process.env.DEBUG = 'bfx:hf:*'

const startHFServer = require('..')

const dir = `${os.homedir()}/.honeyframework`

startHFServer({
  uiDBPath: `${dir}/ui.json`,
  algoDBPath: `${dir}/algos.json`

  // bfxRestURL: '',
  // bfxWSURL: ''
})

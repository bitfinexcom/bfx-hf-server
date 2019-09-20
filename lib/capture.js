'use strict'

const debug = require('debug')('bfx:hf:server:capture-exception')
const { sprintf } = require('sprintf-js')

const exception = (err, ...args) => {
  const str = args.length > 0
    ? sprintf(err, ...args)
    : err instanceof Error
      ? err.message
      : err

  debug(err instanceof Error ? err.stack : str)
}

module.exports = { exception }

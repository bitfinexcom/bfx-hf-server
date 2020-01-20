'use strict'

const hash = require('./hash')

module.exports = (user) => {
  const { id, username, password } = user
  return hash(id, username, password)
}

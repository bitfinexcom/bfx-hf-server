'use strict'

const recvSubscribed = require('./subscribed')

module.exports = (exa, msg) => {
  const { status } = msg

  if (status === 'subscribed') {
    recvSubscribed(exa, msg)
  } else {
    console.log(msg)
  }
}

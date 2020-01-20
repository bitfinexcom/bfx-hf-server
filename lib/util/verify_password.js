'use strict'

const AES = require('aes-js')
const { get: getCredentials } = require('../db/credentials')
const genAESKey = require('./gen_aes_key')

module.exports = async (db, hashedPassword) => {
  const credentials = await getCredentials(db)
  const key = await genAESKey(hashedPassword)

  const aesCTR = new AES.ModeOfOperation.ctr(key) // eslint-disable-line
  const hashedPasswordBytes = AES.utils.utf8.toBytes(hashedPassword)
  const controlBytes = AES.utils.utf8.toBytes('control')
  const cipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(hashedPasswordBytes))
  const cipherControl = AES.utils.hex.fromBytes(aesCTR.encrypt(controlBytes))

  if (cipherControl === credentials.key && cipherText === credentials.secret) {
    return cipherControl
  }

  return null
}

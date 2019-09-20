'use strict'

const AES = require('aes-js')
const genAESKey = require('./gen_aes_key')

module.exports = async ({ exID, password, key, secret }) => {
  const aesKey = await genAESKey(password)

  const aesCTR = new AES.ModeOfOperation.ctr(aesKey) // eslint-disable-line
  const exIDBytes = AES.utils.utf8.toBytes(exID)
  const keyBytes = AES.utils.utf8.toBytes(key)
  const secretBytes = AES.utils.utf8.toBytes(secret)
  const controlBytes = AES.utils.utf8.toBytes('control')
  const exIDCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(exIDBytes))
  const keyCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(keyBytes))
  const secretCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(secretBytes))
  const controlCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(controlBytes))

  return {
    cid: exIDCipherText,
    key: keyCipherText,
    secret: secretCipherText,
    meta: controlCipherText
  }
}

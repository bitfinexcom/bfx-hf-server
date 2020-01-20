'use strict'

const AES = require('aes-js')
const genAESKey = require('./gen_aes_key')

module.exports = async ({ password, credentials }) => {
  const { cid, key, secret, meta } = credentials
  const aesKey = await genAESKey(password)

  const aesCTR = new AES.ModeOfOperation.ctr(aesKey) // eslint-disable-line
  const decryptedExID = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(cid)))
  const decryptedKey = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(key)))
  const decryptedSecret = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(secret)))
  const decryptedControl = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(meta)))

  if (decryptedControl !== 'control') {
    return null
  }

  return {
    exID: decryptedExID,
    key: decryptedKey,
    secret: decryptedSecret
  }
}

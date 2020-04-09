'use strict'

const AES = require('aes-js')
const genAESKey = require('./gen_aes_key')

const VERSION = 2 // 2 - added version number

module.exports = async (strategy, password) => {
  const {
    id, label, version, cryptedLabel, defineIndicators, defineMeta, exec
  } = strategy

  if (version !== VERSION) { // TODO: log/notify
    return null
  }

  const aesKey = await genAESKey(password)
  const aesCTR = new AES.ModeOfOperation.ctr(aesKey) // eslint-disable-line

  const decryptedLabel = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(cryptedLabel)))

  if (decryptedLabel !== label) {
    return null
  }

  const decryptedDefineIndicators = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(defineIndicators)))
  const decryptedDefineMeta = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(defineMeta)))
  const decryptedExec = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(exec)))

  return {
    id,
    label,
    defineIndicators: decryptedDefineIndicators,
    defineMeta: decryptedDefineMeta,
    exec: decryptedExec
  }
}

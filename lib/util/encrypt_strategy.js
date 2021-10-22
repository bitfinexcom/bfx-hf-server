'use strict'

const AES = require('aes-js')
const genAESKey = require('./gen_aes_key')

const VERSION = 2 // 2 - added version number

module.exports = async (strategy, password) => {
  const {
    id, label, defineIndicators, defineMeta, exec
  } = strategy

  const aesKey = await genAESKey(password)
  const aesCTR = new AES.ModeOfOperation.ctr(aesKey) // eslint-disable-line

  const labelBytes = AES.utils.utf8.toBytes(label || '')
  const defineIndicatorsBytes = AES.utils.utf8.toBytes(defineIndicators || '')
  const defineMetaBytes = AES.utils.utf8.toBytes(defineMeta || '')
  const execBytes = AES.utils.utf8.toBytes(exec || '')

  const labelCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(labelBytes))
  const defineIndicatorsCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(defineIndicatorsBytes))
  const defineMetaCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(defineMetaBytes))
  const execCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(execBytes))

  return {
    id,
    label,
    version: VERSION,
    cryptedLabel: labelCipherText,

    defineIndicators: defineIndicatorsCipherText,
    defineMeta: defineMetaCipherText,
    exec: execCipherText
  }
}

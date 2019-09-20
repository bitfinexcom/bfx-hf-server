'use strict'

const AES = require('aes-js')
const genAESKey = require('./gen_aes_key')

module.exports = async (strategy, password) => {
  const {
    id, label, defineIndicators, onPriceUpdate, onEnter, onUpdate, onUpdateLong,
    onUpdateShort, onUpdateClosing, onPositionOpen, onPositionUpdate,
    onPositionClose, onStart, onStop
  } = strategy

  const aesKey = await genAESKey(password)
  const aesCTR = new AES.ModeOfOperation.ctr(aesKey) // eslint-disable-line

  const labelBytes = AES.utils.utf8.toBytes(label || '')
  const defineIndicatorsBytes = AES.utils.utf8.toBytes(defineIndicators || '')
  const onPriceUpdateBytes = AES.utils.utf8.toBytes(onPriceUpdate || '')
  const onEnterBytes = AES.utils.utf8.toBytes(onEnter || '')
  const onUpdateBytes = AES.utils.utf8.toBytes(onUpdate || '')
  const onUpdateLongBytes = AES.utils.utf8.toBytes(onUpdateLong || '')
  const onUpdateShortBytes = AES.utils.utf8.toBytes(onUpdateShort || '')
  const onUpdateClosingBytes = AES.utils.utf8.toBytes(onUpdateClosing || '')
  const onPositionOpenBytes = AES.utils.utf8.toBytes(onPositionOpen || '')
  const onPositionUpdateBytes = AES.utils.utf8.toBytes(onPositionUpdate || '')
  const onPositionCloseBytes = AES.utils.utf8.toBytes(onPositionClose || '')
  const onStartBytes = AES.utils.utf8.toBytes(onStart || '')
  const onStopBytes = AES.utils.utf8.toBytes(onStop || '')

  const labelCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(labelBytes))
  const defineIndicatorsCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(defineIndicatorsBytes))
  const onPriceUpdateCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(onPriceUpdateBytes))
  const onEnterCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(onEnterBytes))
  const onUpdateCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(onUpdateBytes))
  const onUpdateLongCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(onUpdateLongBytes))
  const onUpdateShortCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(onUpdateShortBytes))
  const onUpdateClosingCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(onUpdateClosingBytes))
  const onPositionOpenCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(onPositionOpenBytes))
  const onPositionUpdateCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(onPositionUpdateBytes))
  const onPositionCloseCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(onPositionCloseBytes))
  const onStartCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(onStartBytes))
  const onStopCipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(onStopBytes))

  return {
    id,
    label,
    cryptedLabel: labelCipherText,

    defineIndicators: defineIndicatorsCipherText,
    onPriceUpdate: onPriceUpdateCipherText,
    onEnter: onEnterCipherText,
    onUpdate: onUpdateCipherText,
    onUpdateLong: onUpdateLongCipherText,
    onUpdateShort: onUpdateShortCipherText,
    onUpdateClosing: onUpdateClosingCipherText,
    onPositionOpen: onPositionOpenCipherText,
    onPositionUpdate: onPositionUpdateCipherText,
    onPositionClose: onPositionCloseCipherText,
    onStart: onStartCipherText,
    onStop: onStopCipherText
  }
}

'use strict'

const AES = require('aes-js')
const genAESKey = require('./gen_aes_key')

module.exports = async (strategy, password) => {
  const {
    id, label, cryptedLabel, defineIndicators, onPriceUpdate, onEnter, onUpdate,
    onUpdateLong, onUpdateShort, onUpdateClosing, onPositionOpen,
    onPositionUpdate, onPositionClose, onStart, onStop
  } = strategy

  const aesKey = await genAESKey(password)
  const aesCTR = new AES.ModeOfOperation.ctr(aesKey) // eslint-disable-line

  const decryptedLabel = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(cryptedLabel)))

  if (decryptedLabel !== label) {
    return null
  }

  const decryptedDefineIndicators = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(defineIndicators)))
  const decryptedOnPriceUpdate = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(onPriceUpdate)))
  const decryptedOnEnter = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(onEnter)))
  const decryptedOnUpdate = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(onUpdate)))
  const decryptedOnUpdateLong = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(onUpdateLong)))
  const decryptedOnUpdateShort = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(onUpdateShort)))
  const decryptedOnUpdateClosing = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(onUpdateClosing)))
  const decryptedOnPositionOpen = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(onPositionOpen)))
  const decryptedOnPositionUpdate = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(onPositionUpdate)))
  const decryptedOnPositionClose = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(onPositionClose)))
  const decryptedOnStart = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(onStart)))
  const decryptedOnStop = AES.utils.utf8.fromBytes(aesCTR.decrypt(AES.utils.hex.toBytes(onStop)))

  return {
    id,
    label,
    defineIndicators: decryptedDefineIndicators,
    onPriceUpdate: decryptedOnPriceUpdate,
    onEnter: decryptedOnEnter,
    onUpdate: decryptedOnUpdate,
    onUpdateLong: decryptedOnUpdateLong,
    onUpdateShort: decryptedOnUpdateShort,
    onUpdateClosing: decryptedOnUpdateClosing,
    onPositionOpen: decryptedOnPositionOpen,
    onPositionUpdate: decryptedOnPositionUpdate,
    onPositionClose: decryptedOnPositionClose,
    onStart: decryptedOnStart,
    onStop: decryptedOnStop
  }
}

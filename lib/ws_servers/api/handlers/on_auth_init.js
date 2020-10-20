'use strict'

const AES = require('aes-js')
const hash = require('../../../util/hash')
const validateParams = require('../../../util/ws/validate_params')
const { notifyError, notifyInternalError } = require('../../../util/ws/notify')
const genAESKey = require('../../../util/gen_aes_key')
const {
  get: getCredentials,
  set: setCredentials
} = require('../../../db/credentials')

const sendStrategies = require('../send_strategies')
const sendAuthenticated = require('../send_authenticated')

module.exports = async (server, ws, msg) => {
  if (ws.authPassword) {
    return notifyError(ws, 'Already authenticated')
  }

  const { d, db, wsURL, restURL } = server
  const [, password] = msg
  const validRequest = validateParams(ws, {
    password: { type: 'string', v: password }
  })

  if (!validRequest) {
    return
  }

  const hashedPassword = hash(password)
  const existingCredentials = await getCredentials(db)

  if (existingCredentials) {
    return notifyError(ws,
      'Credentials already configured; reset them before re-initializing'
    )
  }

  let key

  try {
    key = await genAESKey(hashedPassword)
  } catch (e) {
    d('error creating encryption key: %s', e.message)
    return notifyInternalError(ws)
  }

  const aesCTR = new AES.ModeOfOperation.ctr(key) // eslint-disable-line
  const hashedPasswordBytes = AES.utils.utf8.toBytes(hashedPassword)
  const controlBytes = AES.utils.utf8.toBytes('control')
  const cipherText = AES.utils.hex.fromBytes(aesCTR.encrypt(hashedPasswordBytes))
  const cipherControl = AES.utils.hex.fromBytes(aesCTR.encrypt(controlBytes))

  await setCredentials(db, cipherControl, cipherText)

  d('initialized credentials')

  ws.authPassword = hashedPassword
  ws.authControl = cipherControl

  ws.aoc = server.openAlgoServerClient()
  ws.aoc.identify(ws, cipherControl)

  await sendAuthenticated(ws, db, d, { wsURL, restURL })
  await sendStrategies(ws, db, d)
}

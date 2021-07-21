'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { db, d } = server
  const { Layouts } = db
  const [, authToken] = msg

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const layouts = (await Layouts.get()) || {}

  send(ws, ['data.layouts.saved', layouts])
}

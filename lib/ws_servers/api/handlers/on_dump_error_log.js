'use strict'

const send = require('../../../util/ws/send')
const validateParams = require('../../../util/ws/validate_params')
const dumpErrorLog = require('../../../util/dump_error_log')

module.exports = async (server, ws, msg) => {
  const [, errorLog] = msg

  const validRequest = validateParams(ws, {
    errorLog: { type: 'string', v: errorLog }
  })

  if (!validRequest) {
    return send(ws, ['data.app_log', 'failed'])
  }

  await dumpErrorLog(ws, errorLog)
}

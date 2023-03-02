'use strict'

const validateParams = require('../../../util/ws/validate_params')

module.exports = async (server, ws, msg) => {
  const { d } = server
  const [, level, log] = msg

  const { sendDataToMetricsServer } = ws

  const validRequest = validateParams(ws, {
    level: { type: 'enum', v: [['error', 'fatal'], level] },
    log: { type: 'string', v: log }
  })

  if (!validRequest) {
    return d('error: Invalid request params while sending error/fatal event to metrics server')
  }

  sendDataToMetricsServer([`${level}_event`, log])
}

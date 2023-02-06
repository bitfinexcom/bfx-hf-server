'use strict'

const os = require('os')
const { appendFile, mkdir } = require('fs/promises')
const { existsSync } = require('fs')
const send = require('../util/ws/send')

const LOG_DIR_PATH = `${os.tmpdir()}/bfx-hf-ui-logs`
const APP_LOG_PATH = `${LOG_DIR_PATH}/app.log`

/**
 * Store the error log in app.log file
 * @param {object} ws
 * @param {string} errorLog - json string
 * @returns {void}
 */
module.exports = async (ws, errorLog) => {
  try {
    if (!existsSync(LOG_DIR_PATH)) {
      await mkdir(LOG_DIR_PATH)
    }

    await appendFile(APP_LOG_PATH, `${errorLog}${os.EOL}`)
  } catch (e) {
    console.error('ERR_APP_LOG', e)
    send(ws, ['data.app_log_error', e.message])
  }
}

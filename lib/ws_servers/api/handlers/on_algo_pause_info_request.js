'use strict'

const _isEmpty = require('lodash/isEmpty')
const send = require('../../../util/ws/send')

const { _default: { showAlgoPauseInfo: defaultShowAlgoPauseInfo } } = require('bfx-hf-ui-config').UserSettings

module.exports = async (server, ws, msg) => {
  const { algoDB, db } = server
  const { AlgoOrder } = algoDB
  const { UserSettings } = db

  const [{ userSettings = {} }, aos = []] = await Promise.all([
    UserSettings.getAll(),
    AlgoOrder.find([['active', '=', true]])
  ])

  const showAlgoPauseInfo = _isEmpty(userSettings)
    ? defaultShowAlgoPauseInfo
    : userSettings.showAlgoPauseInfo

  if (!showAlgoPauseInfo || aos.length === 0) {
    send(ws, ['data.show_algo_pause_info', false])
    return
  }

  send(ws, ['data.show_algo_pause_info', true])
}

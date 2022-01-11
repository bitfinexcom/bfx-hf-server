'use strict'

const send = require('../../../util/ws/send')
const getUserSettings = require('../../../util/user_settings')

module.exports = async (server, ws) => {
  const { algoDB, db } = server
  const { AlgoOrder } = algoDB

  const [{ showAlgoPauseInfo }, aos = []] = await Promise.all([
    getUserSettings(db),
    AlgoOrder.find([['active', '=', true]])
  ])

  if (!showAlgoPauseInfo || aos.length === 0) {
    send(ws, ['data.show_algo_pause_info', false])
    return
  }

  send(ws, ['data.show_algo_pause_info', true])
}

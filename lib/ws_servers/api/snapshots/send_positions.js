const onPositionsSnapshot = require('../events/positions_snapshot')
const sendError = require('../../../util/ws/send_error')

/**
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @param {RESTv2} rest
 */
module.exports = async (session, ws, rest) => {
  const { isPaper } = session

  try {
    const positions = await rest.positions()
    const formatted = positions.map(pos => pos.serialize())

    return onPositionsSnapshot(ws, isPaper, formatted)
  } catch (err) {
    sendError(ws, err.message)
  }
}

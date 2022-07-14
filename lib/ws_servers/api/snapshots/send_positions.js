const onPositionsSnapshot = require('../events/positions_snapshot')

/**
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @param {RESTv2} rest
 */
module.exports = async (session, ws, rest) => {
  const { isPaper } = session
  const positions = await rest.positions()
  const formatted = positions.map(pos => pos.serialize())

  return onPositionsSnapshot(ws, isPaper, formatted)
}

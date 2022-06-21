const onPositionsSnapshot = require('../events/positions_snapshot')

/**
 * @param {Session} ws
 * @param {RESTv2} rest
 */
module.exports = async (ws, rest) => {
  const { isPaper } = ws
  const positions = await rest.positionsHistory()
  const formatted = positions.map(pos => pos.serialize())

  return onPositionsSnapshot(ws, isPaper, formatted)
}

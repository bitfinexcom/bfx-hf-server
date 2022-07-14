/**
 * @typedef {{send: function(data)}} FilteredWebSocket
 */

/**
 * @param {Session} session
 * @returns {FilteredWebSocket}
 * @private
 */
module.exports = (session) => {
  const { mode } = session

  return {
    send: (data) => {
      if (session.mode === mode) {
        session.send(data)
      }
    }
  }
}

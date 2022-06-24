const send = require('../../../util/ws/send')

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
        send(session, data)
      }
    }
  }
}

const DmsRemoteControl = require('../dms_remote_control')

/**
 * @param {APIWSServer} server
 * @returns {DmsRemoteControl}
 */
module.exports = (server) => {
  const { hostedURL, restURL } = server
  return new DmsRemoteControl({
    hostedURL,
    restURL
  })
}

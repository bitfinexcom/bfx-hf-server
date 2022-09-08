const MetricsClient = require('../metrics_client')

/**
 * @param {APIWSServer} server
 * @param {Session} session
 * @returns {MetricsClient}
 */
module.exports = (server, session) => {
  const {
    metricsServerURL,
    restURL,
    os,
    releaseVersion,
    isRC
  } = server
  const { id: sessionId } = session

  return new MetricsClient({
    metricsServerURL,
    restURL,
    os,
    releaseVersion,
    isRC,
    sessionId
  })
}

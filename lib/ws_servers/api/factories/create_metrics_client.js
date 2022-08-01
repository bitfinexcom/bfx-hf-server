'use strict'

const send = require('../../../util/ws/send')
const MetricsClient = require('../metrics_client')

/**
 * @param {APIWSServer} server
 * @returns {MetricsClient}
 */
module.exports = (server, ws, sessionId) => {
  const { metricsServerURL, restURL, os, releaseVersion, isRC } = server
  const bcast = send.bind(null, ws)

  return new MetricsClient(
    {
      metricsServerURL,
      restURL,
      os,
      releaseVersion,
      isRC
    },
    bcast,
    sessionId
  )
}

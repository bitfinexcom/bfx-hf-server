'use strict'

const ServiceHub = require('./service_hub')

/**
 * @property {number} id
 * @property {'main' | 'paper' | null} mode
 * @property {boolean?} isPaper
 * @property {string | null} authPassword
 * @property {string | null} authControl
 * @property {string | null} dmsScope
 */
class Session {
  /**
   * @param {WebSocket} ws
   */
  constructor (ws) {
    this.ws = ws
    this.id = null
    this.mode = null
    this.isPaper = null
    this.dmsScope = null
    this.authPassword = null
    this.authControl = null
    this.metricsClient = null
    this.credentials = {
      main: { apiKey: null, apiSecret: null },
      paper: { apiKey: null, apiSecret: null }
    }
    this.services = {
      main: new ServiceHub(),
      paper: new ServiceHub()
    }
  }

  /**
   * @return {BitfinexExchangeConnection|null}
   */
  getClient () {
    if (!this.mode) return null
    return this.services[this.mode].client
  }

  /**
   * @return {AlgoWorker|null}
   */
  getAlgoWorker () {
    if (!this.mode) return null
    return this.services[this.mode].algoWorker
  }

  /**
   * @return {DmsRemoteControl|null}
   */
  getDmsControl () {
    if (!this.mode) return null
    return this.services[this.mode].dmsControl
  }

  /**
   * @return {StrategyManager|null}
   */
  getStrategyManager () {
    if (!this.mode) return null
    return this.services[this.mode].strategyManager
  }

  /**
   * @return {MetricsClient|null}
   */
  getMetricsClient () {
    if (this.metricsClient) {
      return this.metricsClient
    }
    if (!this.mode) {
      return null
    }
    return this.services[this.mode].metricsClient
  }

  /**
   * @return {{apiKey: string | null, apiSecret: string | null}}
   */
  getCredentials () {
    if (!this.mode) {
      return { apiKey: null, apiSecret: null }
    }
    return this.credentials[this.mode]
  }

  /**
   * @param {BitfinexExchangeConnection} client
   */
  setClient (client) {
    this.services[this.mode].client = client
  }

  /**
   * @param {DmsRemoteControl} dmsControl
   */
  setDmsControl (dmsControl) {
    this.services[this.mode].dmsControl = dmsControl
  }

  /**
   * @param {AlgoWorker} algoWorker
   */
  setAlgoWorker (algoWorker) {
    this.services[this.mode].algoWorker = algoWorker
  }

  /**
   * @param {StrategyManager} strategyManager
   */
  setStrategyManager (strategyManager) {
    this.services[this.mode].strategyManager = strategyManager
  }

  /**
   * @param {MetricsClient} metricsClient
   */
  setMetricsClient (metricsClient) {
    if (this.metricsClient) {
      this.metricsClient = null
    }
    if (this.mode) {
      this.services[this.mode].metricsClient = metricsClient
    } else {
      this.metricsClient = metricsClient
    }
  }

  /**
   * @param {string} apiKey
   * @param {string} apiSecret
   * @param {'paper' | 'main'} mode
   * @param {string} dmsScope
   */
  authenticateSession ({ apiKey, apiSecret, mode, dmsScope }) {
    this.mode = mode
    this.dmsScope = dmsScope
    this.isPaper = mode === 'paper'
    this.setCredentialsForMode(mode, apiKey, apiSecret)
  }

  setCredentialsForMode (mode, apiKey, apiSecret) {
    this.credentials[mode] = { apiKey, apiSecret }
  }

  get sendDataToMetricsServer () {
    return (data) => {
      const metricsClient = this.getMetricsClient()
      if (metricsClient) {
        metricsClient.send(data)
      }
    }
  }

  on (eventName, listener) {
    return this.ws.on(eventName, listener)
  }

  send (data) {
    this.ws.send(data)
  }

  closeServices () {
    if (this.metricsClient) {
      this.metricsClient.close()
      this.metricsClient = null
    }
    for (const mode of Object.keys(this.services)) {
      this.closeMode(mode)
    }
  }

  closeMode (mode) {
    const hub = this.services[mode]
    return hub.close()
  }
}

module.exports = Session

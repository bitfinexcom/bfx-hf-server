const ServiceHub = require('./service_hub')

/**
 * @property {number} id
 * @property {{key: string | null, secret: string | null}} bitfinexCredentials
 * @property {'main' | 'paper' | null} mode
 * @property {boolean?} isPaper
 */
class Session {
  /**
   * @param {WebSocket} ws
   */
  constructor (ws) {
    this.ws = ws
    this.id = null
    this.bitfinexCredentials = {
      key: null,
      secret: null
    }
    this.mode = null
    this.isPaper = null
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

  on (eventName, listener) {
    return this.ws.on(eventName, listener)
  }

  send (data, options = null, callback = null) {
    this.ws.send(data)
  }

  closeServices () {
    for (const hub of Object.values(this.services)) {
      hub.close()
    }
  }
}

module.exports = Session

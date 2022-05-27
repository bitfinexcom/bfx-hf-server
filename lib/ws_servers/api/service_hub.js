'use strict'

class ServiceHub {
  constructor () {
    this.client = null
    this.algoWorker = null
    this.dmsControl = null
    this.strategyManager = null
    this.metricsClient = null
  }

  close () {
    if (this.dmsControl) {
      this.dmsControl.close()
    }

    if (this.client) {
      this.client.close()
    }

    if (this.algoWorker) {
      this.algoWorker.close()
    }

    if (this.strategyManager) {
      this.strategyManager.stopAllActiveStrategies()
    }

    if (this.metricsClient) {
      this.metricsClient.close()
    }
  }
}

module.exports = ServiceHub

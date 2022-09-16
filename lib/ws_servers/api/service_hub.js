'use strict'

class ServiceHub {
  constructor () {
    this.client = null
    this.algoWorker = null
    this.dmsControl = null
    this.strategyManager = null
    this.metricsClient = null
  }

  async close () {
    if (this.dmsControl) {
      this.dmsControl.close()
      this.dmsControl = null
    }

    if (this.client) {
      this.client.close()
      this.client = null
    }

    if (this.algoWorker) {
      this.algoWorker.close()
      this.algoWorker = null
    }

    if (this.metricsClient) {
      this.metricsClient.close()
      this.metricsClient = null
    }

    if (this.strategyManager) {
      await this.strategyManager.stopAllActiveStrategies()
      this.strategyManager = null
    }
  }
}

module.exports = ServiceHub

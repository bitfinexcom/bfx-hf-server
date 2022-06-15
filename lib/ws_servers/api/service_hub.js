class ServiceHub {
  constructor () {
    this.client = null
    this.algoWorker = null
    this.dmsControl = null
    this.strategyManager = null
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
  }
}

module.exports = ServiceHub

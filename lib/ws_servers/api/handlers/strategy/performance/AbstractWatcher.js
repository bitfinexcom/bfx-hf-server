const EventEmitter = require('events')

class AbstractWatcher extends EventEmitter {
  constructor (performanceManager, closeMode) {
    super()
    this.performanceManager = performanceManager
    this.closeMode = closeMode

    this.performanceManager.on('update', this.onUpdate.bind(this))
  }

  /**
   * @protected
   */
  abortStrategy () {
    console.log(this.closeMode)
  }

  close () {
    this.performanceManager.on('update', this.onUpdate.bind(this))
  }
}

module.exports = AbstractWatcher

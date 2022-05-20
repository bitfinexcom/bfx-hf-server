const AbstractWatcher = require('./AbstractWatcher')

class AbsoluteStopLossWatcher extends AbstractWatcher {
  constructor (performanceManager, { stopLoss, closeMode }) {
    super(performanceManager, closeMode)
    this.stopLoss = stopLoss
  }

  onUpdate () {
    const unrealizedPnl = this.performanceManager.return()

    if (unrealizedPnl.isNegative() && unrealizedPnl.abs().isGreaterThanOrEqualTo(this.stopLoss)) {
      this.abortStrategy()
    }
  }
}

module.exports = AbsoluteStopLossWatcher

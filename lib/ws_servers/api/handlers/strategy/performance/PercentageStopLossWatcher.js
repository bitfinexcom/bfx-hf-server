const AbstractWatcher = require('./AbstractWatcher')

class PercentageStopLossWatcher extends AbstractWatcher {
  constructor (performanceManager, { stopLoss, closeMode }) {
    super(performanceManager, closeMode)
    this.stopLoss = stopLoss
  }

  onUpdate () {
    const unrealizedPerc = this.performanceManager.returnPerc()

    if (unrealizedPerc.isNegative() && unrealizedPerc.abs().isGreaterThanOrEqualTo(this.stopLoss)) {
      this.abortStrategy()
    }
  }
}

module.exports = PercentageStopLossWatcher

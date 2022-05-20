const EventEmitter = require('events')
const BigNumber = require('bignumber.js')

class PerformanceManager extends EventEmitter {
  /**
   * @param priceFeed
   * @param {BigNumber} maxPositionSize
   * @param {BigNumber} allocation
   */
  constructor (priceFeed, {
    maxPositionSize,
    allocation
  }) {
    super()

    this.maxPositionSize = maxPositionSize
    this.allocation = allocation
    this.availableFunds = new BigNumber(allocation)
    this.priceFeed = priceFeed

    this.peak = new BigNumber(allocation)
    this.prevPeak = new BigNumber(0)
    this.trough = new BigNumber(allocation)
    this.openOrders = []

    priceFeed.on('update', this.selfUpdate.bind(this))
  }

  /**
   * @param {BigNumber} amount
   * @param {BigNumber} price
   * @returns {Error|null}
   */
  canOpenOrder (amount, price) {
    const positionSize = this.positionSize()
    const newPositionSize = positionSize.plus(amount)
    if (newPositionSize.isGreaterThan(this.maxPositionSize)) {
      return new Error(`order size exceeds maximum position size (order amount: ${amount}, current size: ${positionSize}, max size: ${this.maxPositionSize})`)
    }

    if (newPositionSize.isNegative()) {
      return new Error('short positions are not allowed in this version')
    }

    const total = amount.multipliedBy(price)

    const currentAllocation = this.currentAllocation()
    const newAllocatedCapital = currentAllocation.plus(total)
    if (newAllocatedCapital.isGreaterThan(this.allocation)) {
      return new Error(`order exceeds max allocation (total: ${total}, current alloc: ${currentAllocation}, max alloc: ${this.allocation})`)
    }

    if (total.isGreaterThan(this.availableFunds)) {
      return new Error(`order exceeds available funds (total: ${total}, available funds: ${this.availableFunds})`)
    }

    return null
  }

  /**
   * @returns {BigNumber}
   */
  positionSize () {
    return this.openOrders.reduce((size, order) =>
      size.plus(order.amount),
    new BigNumber(0)
    )
  }

  /**
   * @returns {BigNumber}
   */
  currentAllocation () {
    return this.openOrders.reduce((alloc, order) =>
      alloc.plus(order.amount.multipliedBy(order.price)),
    new BigNumber(0)
    )
  }

  addOrder ({ amount, price }) {
    const total = amount.multipliedBy(price)

    if (amount.isGreaterThanOrEqualTo(0)) {
      this.availableFunds = this.availableFunds.minus(total)
      this.openOrders.push({ amount, price })
      this.selfUpdate()
      return
    }

    if (this.positionSize().isLessThan(amount.abs())) {
      throw new Error('can not over-sell position')
    }

    this.availableFunds = this.availableFunds.plus(total.abs())

    while (!amount.isZero() && this.openOrders.length > 0) {
      const order = this.openOrders.shift()

      if (order.amount.isLessThanOrEqualTo(amount.abs())) {
        amount = amount.plus(order.amount)
      } else {
        order.amount = order.amount.plus(amount)
        this.openOrders.unshift(order)
        break
      }
    }

    this.selfUpdate()
  }

  /**
   * @returns {BigNumber}
   */
  equityCurve () {
    return this.priceFeed.price.multipliedBy(this.positionSize()).plus(this.availableFunds)
  }

  /**
   * @returns {BigNumber}
   */
  return () {
    return this.equityCurve().minus(this.allocation)
  }

  /**
   * @returns {BigNumber}
   */
  returnPerc () {
    return this.return().dividedBy(this.allocation)
  }

  /**
   * @returns {BigNumber}
   */
  drawdown () {
    const equityCurve = this.equityCurve()
    if (equityCurve.isGreaterThanOrEqualTo(this.prevPeak) || this.prevPeak.isZero()) {
      return new BigNumber(0)
    }
    return this.prevPeak.minus(equityCurve).dividedBy(this.prevPeak)
  }

  /**
   * @private
   */
  selfUpdate () {
    this.updatePeak()
    this.updateTrough()
    this.emit('update')
  }

  /**
   * @private
   */
  updatePeak () {
    const equityCurve = this.equityCurve()
    if (equityCurve.isGreaterThan(this.peak)) {
      this.prevPeak = this.peak
      this.peak = equityCurve
    }
  }

  /**
   * @private
   */
  updateTrough () {
    const equityCurve = this.equityCurve()
    if (equityCurve.isLessThan(this.trough) || this.trough.isZero()) {
      this.trough = equityCurve
    }
  }

  close () {
    this.removeAllListeners()
  }
}

module.exports = PerformanceManager

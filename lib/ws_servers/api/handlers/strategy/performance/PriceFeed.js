const EventEmitter = require('events')

class PriceFeed extends EventEmitter {
  constructor (price = null) {
    super()
    this.price = price
  }

  update (price) {
    this.price = price
    this.emit('update', price)
  }

  close () {
    this.removeAllListeners()
  }
}

module.exports = PriceFeed

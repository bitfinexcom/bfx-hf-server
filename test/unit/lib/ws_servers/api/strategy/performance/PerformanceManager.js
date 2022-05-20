/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { expect } = require('chai')
const BigNumber = require('bignumber.js')
const assert = require('assert')

const PerformanceManager = require('../../../../../../../lib/ws_servers/api/handlers/strategy/performance/PerformanceManager')
const PriceFeed = require('../../../../../../../lib/ws_servers/api/handlers/strategy/performance/PriceFeed')

describe('PerformanceManager', () => {
  const priceFeed = new PriceFeed(new BigNumber(35000))

  const constraints = {
    maxPositionSize: new BigNumber(1),
    allocation: new BigNumber(13000)
  }

  describe('position management', () => {
    const pos = new PerformanceManager(priceFeed, constraints)

    it('clean', () => {
      expect(pos.positionSize().toNumber()).to.eq(0)
      expect(pos.currentAllocation().toNumber()).to.eq(0)
      expect(pos.peak.toNumber()).to.eq(13000)
      expect(pos.trough.toNumber()).to.eq(13000)
      expect(pos.availableFunds.toNumber()).to.eq(13000)
      expect(pos.equityCurve().toNumber()).to.eq(13000)
      expect(pos.return().toNumber()).to.eq(0)
      expect(pos.returnPerc().toNumber()).to.eq(0)
      expect(pos.drawdown().toNumber()).to.eq(0)
    })

    it('add orders', (done) => {
      pos.addOrder({
        amount: new BigNumber('0.1'),
        price: new BigNumber('35000')
      })

      pos.addOrder({
        amount: new BigNumber('0.1'),
        price: new BigNumber('37089.17')
      })
      priceFeed.update(new BigNumber('37089.17'))

      pos.addOrder({
        amount: new BigNumber('0.1'),
        price: new BigNumber('40229.09')
      })
      priceFeed.update(new BigNumber('40229.09'))

      pos.addOrder({
        amount: new BigNumber('0.04709128732'),
        price: new BigNumber('37547.71')
      })
      priceFeed.update(new BigNumber('37547.71'))

      setImmediate(() => {
        expect(pos.positionSize().toFixed(2)).to.eq('0.35')
        expect(pos.currentAllocation().toFixed(2)).to.eq('13000.00')
        expect(pos.peak.toFixed(2)).to.eq('13963.17')
        expect(pos.trough.toFixed(2)).to.eq('12791.08')
        expect(pos.availableFunds.toFixed(2)).to.eq('0.00')
        expect(pos.equityCurve().toFixed(2)).to.eq('13032.49')
        expect(pos.return().toFixed(2)).to.eq('32.49')
        expect(pos.returnPerc().toFixed(4)).to.eq('0.0000')
        expect(pos.drawdown().toFixed(4)).to.eq('0.0600')
        done()
      })
    })

    it('update price', (done) => {
      priceFeed.update(new BigNumber('34955.37'))

      setImmediate(() => {
        expect(pos.equityCurve().toFixed(2)).to.eq('12132.71')
        expect(pos.return().toFixed(2)).to.eq('-867.29')
        expect(pos.returnPerc().toFixed(4)).to.eq('-0.0700')
        expect(pos.drawdown().toFixed(4)).to.eq('0.1200')
        done()
      })
    })

    it('sell all', () => {
      pos.addOrder({
        amount: pos.positionSize().negated(),
        price: new BigNumber('32177.86')
      })

      expect(pos.positionSize().toFixed(2)).to.eq('0.00')
      expect(pos.currentAllocation().toFixed(2)).to.eq('0.00')
      expect(pos.availableFunds.toFixed(2)).to.eq('11168.66')
      expect(pos.equityCurve().toFixed(2)).to.eq('11168.66')
      expect(pos.return().toFixed(2)).to.eq('-1831.34')
      expect(pos.returnPerc().toFixed(4)).to.eq('-0.1400')
      expect(pos.drawdown().toFixed(4)).to.eq('0.1900')
    })

    it('try to over-sell', () => {
      try {
        pos.addOrder({
          amount: new BigNumber(-1),
          price: new BigNumber('32177.86')
        })
        assert.fail()
      } catch (e) {
        expect(e.message).to.eq('can not over-sell position')
      }
    })
  })

  describe('add orders', () => {
    it('partial sell', () => {
      const pos = new PerformanceManager(priceFeed, constraints)
      const price = new BigNumber(1000)

      pos.addOrder({
        amount: new BigNumber(0.3),
        price
      })

      pos.addOrder({
        amount: new BigNumber(0.7),
        price
      })

      pos.addOrder({
        amount: new BigNumber(-0.5),
        price
      })

      expect(pos.positionSize().toNumber()).to.eq(0.5)
    })
  })

  describe('can open order', () => {
    const pos = new PerformanceManager(priceFeed, constraints)

    it('order is valid', () => {
      const amount = new BigNumber(0.5)
      const price = new BigNumber(500)
      const err = pos.canOpenOrder(amount, price)

      expect(err).to.be.null
    })

    it('max size exceeded', () => {
      const amount = new BigNumber(4)
      const price = new BigNumber(500)
      const err = pos.canOpenOrder(amount, price)

      expect(err).to.be.instanceOf(Error)
      expect(err.message).to.eq('order size exceeds maximum position size (order amount: 4, current size: 0, max size: 1)')
    })

    it('max alloc exceeded', () => {
      const amount = new BigNumber(0.5)
      const price = new BigNumber(50000)
      const err = pos.canOpenOrder(amount, price)

      expect(err).to.be.instanceOf(Error)
      expect(err.message).to.eq('order exceeds max allocation (total: 25000, current alloc: 0, max alloc: 13000)')
    })

    it('total is greater than the available funds', () => {
      const amount = new BigNumber(0.5)
      const price = new BigNumber(3000)

      const pos = new PerformanceManager(priceFeed, constraints)
      pos.availableFunds = new BigNumber(500)
      const err = pos.canOpenOrder(amount, price)

      expect(err).to.be.instanceOf(Error)
      expect(err.message).to.eq('order exceeds available funds (total: 1500, available funds: 500)')
    })

    it('short not allowed', () => {
      const amount = new BigNumber(-0.5)
      const price = new BigNumber(50000)
      const pos = new PerformanceManager(priceFeed, constraints)
      const err = pos.canOpenOrder(amount, price)

      expect(err).to.be.instanceOf(Error)
      expect(err.message).to.eq('short positions are not allowed in this version')
    })
  })
})

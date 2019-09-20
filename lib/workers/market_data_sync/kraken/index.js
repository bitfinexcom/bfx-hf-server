'use strict'

const debug = require('debug')('bfx:hf:server:worker:kraken-candle-sync')
const Kraken = require('node-kraken-api')
const PI = require('p-iteration')
const _last = require('lodash/last')
const BigN = require('bignumber.js')

const dbRL = require('../../../db/pg_rate_limited')
const EXA = require('../../../exchange_clients/kraken')
const TIME_FRAMES = require('../../../util/candle_time_frames')
const candleMTS = require('../../../util/candle_mts')

const getFirstTrade = require('./get_first_trade')

module.exports = async (db) => {
  const { Market } = db
  const client = Kraken()
  const markets = await Market.find([['exchange', '=', EXA.id]])

  debug('syncing market data for %d markets', markets.length)

  PI.forEach(markets, async (market) => {
    const symbol = market.restID
    const firstTrade = await getFirstTrade(symbol)

    let last = `${firstTrade ? +firstTrade.mts * 1000000 : 0}`
    let lastTradeMTS = firstTrade ? +firstTrade.mts / 1000 : 0

    while (true) {
      debug('fetching trades for %s from %s', symbol, last)

      const res = await client.call('Trades', {
        pair: symbol,
        since: last
      })

      const tradesRes = Object.values(res)[0]

      if (tradesRes === 0) {
        continue
      }

      const trades = tradesRes.filter(t => +t[2] > lastTradeMTS)

      // Prevent dup key error where trades have same mts
      trades.forEach((t, n) => {
        if (n !== trades.length - 1) {
          if (t[2] === trades[n + 1][2]) {
            trades[n + 1][2] = +trades[n + 1][2] + (Math.floor(Math.random() * 10) / 100000)
          }
        }
      })

      if (trades.length === 0) {
        continue
      }

      lastTradeMTS = +_last(trades)[2]
      last = res.last

      await dbRL((db) => {
        return db.transaction(trx => {
          return db('kraken_trades')
            .insert(trades.map(t => ({
              symbol,
              price: t[0],
              amount: `${+t[1] * (t[3] === 's' ? -1 : 1)}`,
              mts: new BigN(t[2]).times(1000).toString(),
              context: t[4]
            })))
            .transacting(trx)
            .then(trx.commit)
            .catch(trx.rollback)
        })
      })

      debug('inserted %s trades for %s', trades.length, symbol)

      let insertedCandles = 0

      await PI.forEach(Object.keys(TIME_FRAMES), async (tf) => {
        const newCandles = []

        let trade
        let tradeCandleMTS
        let currentMTS = candleMTS(trades[0][2], tf)
        let currentCandle = await dbRL((db) => {
          return db('kraken_candles')
            .where({ key: `${symbol}-${tf}-${currentMTS}` })
            .first('*')
        })

        let wasExistingCandle = !!currentCandle

        for (let i = 0; i < trades.length; i += 1) {
          trade = trades[i]
          tradeCandleMTS = candleMTS(trade[2], tf)

          if (currentCandle && currentCandle.mts !== tradeCandleMTS) {
            newCandles.push([{ ...currentCandle }, wasExistingCandle])

            const candleDelta = +tradeCandleMTS - +currentCandle.mts

            // Insert empty candles
            if (candleDelta > TIME_FRAMES[tf]) {
              const emptyCandles = []

              for (let i = 0; i < (candleDelta / TIME_FRAMES[tf]) - 1; i += 1) {
                const mts = +currentCandle.mts + (TIME_FRAMES[tf] * (i + 1))

                emptyCandles.push({
                  symbol,
                  tf,
                  open: currentCandle.close,
                  high: currentCandle.close,
                  low: currentCandle.close,
                  close: currentCandle.close,
                  volume: '0',
                  mts: `${mts}`,
                  key: `${symbol}-${tf}-${mts}`,
                  count: 0
                })
              }

              await dbRL((db) => {
                return db.transaction(trx => {
                  return db('kraken_candles')
                    .insert(emptyCandles)
                    .transacting(trx)
                    .then(trx.commit)
                    .catch(trx.rollback)
                })
              })
            }

            currentCandle = null
            currentMTS = tradeCandleMTS
            wasExistingCandle = false
          }

          if (!currentCandle) {
            currentCandle = {
              symbol,
              tf,
              open: `${trade[0]}`,
              high: `${trade[0]}`,
              low: `${trade[0]}`,
              close: `${trade[0]}`,
              volume: `${trade[1]}`,
              mts: currentMTS,
              key: `${symbol}-${tf}-${currentMTS}`,
              count: 1
            }
          } else {
            currentCandle.close = `${trade[0]}`
            currentCandle.high = `${Math.max(+currentCandle.high, +trade[0])}`
            currentCandle.low = `${Math.min(+currentCandle.low, +trade[0])}`
            currentCandle.volume = `${+currentCandle.volume + +trade[1]}`
            currentCandle.count += 1
          }
        }

        newCandles.push([{ ...currentCandle }, wasExistingCandle])

        insertedCandles += newCandles.length

        if (newCandles[0][1]) {
          await dbRL((db) => {
            return db('kraken_candles')
              .where({ key: newCandles[0][0].key })
              .update(newCandles[0][0])
          })
        }

        await dbRL((db) => {
          return db.transaction(trx => {
            return db('kraken_candles')
              .insert(newCandles.filter(c => !c[1]).map(c => c[0]))
              .transacting(trx)
              .then(trx.commit)
              .catch(trx.rollback)
          })
        })
      })

      debug('inserted %d candles for %s', insertedCandles, symbol)
    }
  })
}

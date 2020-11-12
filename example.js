'use strict'

const Ws = require('ws')
const ws = new Ws('ws://localhost:45000')

ws.on('open', () => {
  console.log('open')

  msgs.forEach((msg, i) => {
    ws.send(
      JSON.stringify(msg)
    )
    console.log('sent', i)
  })
})

ws.on('message', (data) => {
  // console.log(data)
})

const msgs = [
  [
    'subscribe',
    'bitfinex',
    [
      'ticker',
      {
        exchange: 'bitfinex',
        quote: 'USD',
        base: 'ADA',
        wsID: 'tADAUSD',
        restID: 'tADAUSD',
        uiID: 'ADA/USD',
        contexts: [
          'e',
          'm'
        ]
      }
    ]
  ],
  [
    'get.candles',
    'bitfinex',
    {
      exchange: 'bitfinex',
      quote: 'USD',
      base: 'ADA',
      wsID: 'tADAUSD',
      restID: 'tADAUSD',
      uiID: 'ADA/USD',
      contexts: [
        'e',
        'm'
      ]
    },
    '1m',
    1605122077205,
    1605182077205
  ],
  [
    'subscribe',
    'bitfinex',
    [
      'candles',
      '1m',
      {
        exchange: 'bitfinex',
        quote: 'USD',
        base: 'ADA',
        wsID: 'tADAUSD',
        restID: 'tADAUSD',
        uiID: 'ADA/USD',
        contexts: [
          'e',
          'm'
        ]
      }
    ]
  ],
  [
    'subscribe',
    'bitfinex',
    [
      'trades',
      {
        exchange: 'bitfinex',
        quote: 'USD',
        base: 'ADA',
        wsID: 'tADAUSD',
        restID: 'tADAUSD',
        uiID: 'ADA/USD',
        contexts: [
          'e',
          'm'
        ]
      }
    ]
  ]
]

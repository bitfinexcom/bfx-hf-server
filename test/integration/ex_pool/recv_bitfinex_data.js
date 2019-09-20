/* eslint-env mocha */
'use strict'

const testPoolExRecvData = require('../util/test_pool_ex_recv_data')

testPoolExRecvData('bitfinex', [
  { wsID: 'tBTCUSD' },
  { wsID: 'tLEOUSD' },
  { wsID: 'tETHUSD' },
  { wsID: 'tLTCUSD' },
  { wsID: 'tEOSUSD' }
], 20000)

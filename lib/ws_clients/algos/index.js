'use strict'

const Promise = require('bluebird')
const { nonce } = require('bfx-api-node-util')
const WSClient = require('../../ws_client')

const onUnknownMessage = require('./handlers/on_unknown_message')
const onError = require('./handlers/on_error')
const onStartedAO = require('./handlers/on_started_ao')
const onStoppedAO = require('./handlers/on_stopped_ao')
const onRefusingHostClose = require('./handlers/on_refusing_host_close')
const onHostClosed = require('./handlers/on_host_closed')
const onHostOpened = require('./handlers/on_host_opened')
const onIdentified = require('./handlers/on_identified')
const onStatus = require('./handlers/on_status')
const onDataAOs = require('./handlers/on_data_aos')
const onIsOpenResponse = require('./handlers/on_is_open_res')

const RECONNECT_INTERVAL_MS = 5 * 1000

module.exports = class AlgosServerClient extends WSClient {
  constructor ({ url }) {
    super({
      url,
      debugName: 'algos',
      reconnectIntervalMS: RECONNECT_INTERVAL_MS,
      msgHandlers: {
        _: onUnknownMessage,

        error: onError,
        started: onStartedAO,
        stopped: onStoppedAO,
        persisting: onRefusingHostClose,
        closed: onHostClosed,
        opened: onHostOpened,
        identified: onIdentified,
        status: onStatus,
        'data.aos': onDataAOs,
        'is.open.res': onIsOpenResponse
      }
    })

    this.isOpenCallbacks = {} // see isHostOpen()
  }

  identify (ws, userID) {
    this.userID = userID
    this.userWS = ws

    this.d('identifying...')
    this.send(['identify', userID])
  }

  reconnect () {
    this.send(['reconnect'])
  }

  closeHost (exID) {
    if (!this.userID) {
      return this.d('refusing to close host %s, not identified', exID)
    }

    this.send(['close', this.userID, exID])
  }

  openHost (exID, apiKey, apiSecret) {
    if (!this.userID) {
      return this.d('refusing to open host %s, not identified', exID)
    }

    this.send(['open', this.userID, exID, apiKey, apiSecret])
  }

  async isHostOpen (exID) {
    return new Promise((resolve) => {
      const reqID = `${nonce()}`
      this.isOpenCallbacks[reqID] = resolve

      this.send(['is.open', this.userID, exID, reqID])
    })
  }

  startAO (exID, aoID, packet) {
    if (!this.userID) {
      return this.d('refusing to open host %s, not identified', exID)
    }

    this.send(['submit', this.userID, exID, aoID, packet])
  }

  stopAO (exID, gid) {
    if (!this.userID) {
      return this.d('refusing to open host %s, not identified', exID)
    }

    this.send(['cancel', this.userID, exID, gid])
  }
}

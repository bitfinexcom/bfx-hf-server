'use strict'

const stream = require('stream')
const { promisify } = require('util')
const pipeline = promisify(stream.pipeline)

const express = require('express')
const cors = require('cors')
const got = require('got')

const debug = require('debug')('bfx:hf:server:http-proxy')

class HttpProxy {
  constructor (opts) {
    this.base = opts.restURL
    this.port = opts.port

    this.app = express()
    this.app.use(cors())

    this.setupRoutes()
  }

  setupRoutes () {
    this.app.use('*', async (req, res) => {
      const url = this.base + req.originalUrl

      if (req.baseUrl === '/favicon.ico') {
        return res.status(404).json({ error: 'not found' })
      }

      try {
        await pipeline(
          got.stream(url),
          res
        )
      } catch (e) {
        console.log(e)
      }
    })
  }

  open () {
    const HOST = '127.0.0.1'

    this.app.listen(this.port, HOST, () => {
      debug(`Starting Proxy at ${HOST}:${this.port} for base ${this.base}`)
    })
  }

  close () {
    this.app.close()
  }
}

module.exports = HttpProxy

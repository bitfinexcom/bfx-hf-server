/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const sinon = require('sinon')
const { expect } = require('chai')
const proxyquire = require('proxyquire')
const fs = require('fs')

describe('dump error log', () => {
  let mkdirStub
  let appendFileStub
  let existsSyncStub
  let sendStub
  let dumpErrorLog

  beforeEach(() => {
    mkdirStub = sinon.stub(fs, 'mkdir').callsFake((path, callback) => {
      callback(null)
    })
    appendFileStub = sinon.stub(fs, 'appendFile').callsFake((path, data, callback) => {
      callback(null)
    })
    existsSyncStub = sinon.stub(fs, 'existsSync').returns(true)
    sendStub = sinon.stub()
    dumpErrorLog = proxyquire('../../../../lib/util/dump_error_log', {
      fs: {
        mkdir: mkdirStub,
        appendFile: appendFileStub,
        existsSync: existsSyncStub
      },
      './ws/send': sendStub
    })
  })

  afterEach(() => {
    existsSyncStub.restore()
    mkdirStub.restore()
    appendFileStub.restore()
  })

  it('should create the log directory if it does not exist', async () => {
    const ws = {}
    const errorLog = JSON.stringify({ error: 'test error' })
    existsSyncStub.restore()
    existsSyncStub = sinon.stub(fs, 'existsSync').returns(false)
    dumpErrorLog = proxyquire('../../../../lib/util/dump_error_log', {
      fs: {
        mkdir: mkdirStub,
        appendFile: appendFileStub,
        existsSync: existsSyncStub
      },
      './ws/send': sendStub
    })
    await dumpErrorLog(ws, errorLog)
    expect(mkdirStub.calledOnce).to.be.true
  })

  it('should append the error log to the app.log file', async () => {
    const ws = {}
    const errorLog = JSON.stringify({ error: 'test error' })
    await dumpErrorLog(ws, errorLog)
    expect(appendFileStub.calledOnce).to.be.true
    expect(appendFileStub.firstCall.args[1]).to.contain(errorLog)
  })

  it('should send a message to the WebSocket object if an error occurs', async () => {
    const ws = {}
    const errorLog = JSON.stringify({ error: 'test error' })
    appendFileStub.restore()
    appendFileStub = sinon.stub(fs, 'appendFile').callsFake((path, data, callback) => {
      callback(new Error('Test error'))
    })
    dumpErrorLog = proxyquire('../../../../lib/util/dump_error_log', {
      fs: {
        mkdir: mkdirStub,
        appendFile: appendFileStub,
        existsSync: existsSyncStub
      },
      './ws/send': sendStub
    })
    await dumpErrorLog(ws, errorLog)
    expect(sendStub.calledOnce).to.be.true
    expect(sendStub.firstCall.args[1][1]).to.equal('Test error')
  })
})

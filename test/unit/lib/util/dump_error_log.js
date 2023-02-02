/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const sinon = require('sinon')
const proxyquire = require('proxyquire')
const fs = require('fs')
const { expect } = chai

describe('dump error log', () => {
  let mkdirStub
  let appendFileStub
  let existsSyncStub
  let sendStub
  let dumpErrorLog

  beforeEach(() => {
    mkdirStub = sinon.stub(fs.promises, 'mkdir')
    appendFileStub = sinon.stub(fs.promises, 'appendFile')
    existsSyncStub = sinon.stub(fs, 'existsSync')
    sendStub = sinon.stub()

    dumpErrorLog = proxyquire('../../../../lib/util/dump_error_log', {
      'fs/promises': {
        mkdir: mkdirStub,
        appendFile: appendFileStub
      },
      fs: {
        existsSync: existsSyncStub
      },
      './ws/send': sendStub
    })
  })

  afterEach(() => {
    mkdirStub.restore()
    appendFileStub.restore()
    existsSyncStub.restore()
    sendStub.reset()
  })

  it('should create the log directory if it does not exist', async () => {
    existsSyncStub.returns(false)

    await dumpErrorLog({}, {})

    expect(mkdirStub.calledOnce).to.be.true
  })

  it('should not create the log directory if it is already exist', async () => {
    existsSyncStub.returns(true)

    await dumpErrorLog({}, {})

    expect(mkdirStub.notCalled).to.be.true
  })

  it('should append the error log to the app.log file', async () => {
    existsSyncStub.returns(true)

    const errorLog = JSON.stringify({ error: 'app error' })
    await dumpErrorLog({}, errorLog)

    expect(appendFileStub.calledOnce).to.be.true
    expect(appendFileStub.firstCall.args[1]).to.contain(errorLog)
  })

  it('should send a ws message if an error occurs', async () => {
    existsSyncStub.returns(false)
    mkdirStub.rejects(new Error('MKDIR_ERROR'))

    await dumpErrorLog({}, {})

    expect(sendStub.calledWith({}, ['data.app_log_error', 'MKDIR_ERROR'])).to.be.true
  })
})

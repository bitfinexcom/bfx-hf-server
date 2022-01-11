/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { stub } = require('sinon')
const { expect } = require('chai')
const { UserSettings: { _default } } = require('bfx-hf-ui-config')

const getUserSettings = require('util/user_settings')

describe('get user settings', () => {
  const getAll = stub()
  const UserSettings = { getAll }
  const db = { UserSettings }

  it('user does not have saved settings', async () => {
    getAll.resolves({})

    const result = await getUserSettings(db)

    expect(result).to.eql(_default)
  })

  it('user has saved settings', async () => {
    const savedSettings = {
      custom: 'value',
      dms: false
    }
    getAll.resolves({ userSettings: savedSettings })

    const result = await getUserSettings(db)

    expect(result).to.eql({
      ..._default,
      ...savedSettings
    })
  })
})

'use strict'

const { UserSettings: { _default } } = require('bfx-hf-ui-config')

module.exports = async (db) => {
  const { UserSettings } = db
  const { userSettings = {} } = await UserSettings.getAll()
  return {
    ..._default,
    ...userSettings
  }
}

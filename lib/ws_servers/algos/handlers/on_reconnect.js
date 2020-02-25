'use strict'

const { _default: DEFAULT_SETTINGS } = require('bfx-hf-ui-config').UserSettings

module.exports = async (server, ws) => {
  const { d, apiDB } = server
  const { UserSettings } = apiDB
  const { userSettings: settings } = await UserSettings.getAll()
  const { dms } = settings || DEFAULT_SETTINGS
  const hosts = Object.keys(server.hosts)

  hosts.forEach(k => {
    const h = server.hosts[k]
    const adapter = h.getAdapter()

    if (adapter.updateAuthArgs) {
      adapter.updateAuthArgs({ dms: dms ? 4 : 0 })
    }

    h.reconnect()

    d('issued reconnect for %s [dms %s]', k, dms)
  })
}

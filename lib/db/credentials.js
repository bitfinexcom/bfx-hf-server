'use strict'

const CREDENTIALS_CID = '__hfui__password'

const get = async (db) => {
  const { Credential } = db
  return Credential.get(CREDENTIALS_CID)
}

const set = async (db, key, secret) => {
  const { Credential } = db

  Credential.set({
    cid: CREDENTIALS_CID,
    key,
    secret
  })
}

const reset = async (db) => {
  const { Credential } = db
  await Credential.rmAll()
}

module.exports = { get, set, reset, CREDENTIALS_CID }

/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const { stub, assert } = require('sinon')
const { expect } = require('chai')

const {
  validateKeys,
  hasRequiredPermissions
} = require('../../../../lib/util/validate_credentials')

describe('validate credentials', () => {
  describe('#hasRequiredPermissions', () => {
    it('has all permissions', () => {
      const caps = {
        orders: { read: true, write: true },
        wallets: { read: true, write: false },
        accounts: { read: false }
      }

      const result = hasRequiredPermissions(caps)

      expect(result).to.be.true
    })

    it('does not have all permissions', () => {
      const caps = {
        orders: { read: true, write: false },
        accounts: { read: false }
      }

      const result = hasRequiredPermissions(caps)

      expect(result).to.be.false
    })
  })

  describe('#validateKeys', () => {
    const keyPermissions = stub()
    const rest = { keyPermissions }

    it('should have all permissions', async () => {
      const permissions = [
        {
          key: 'orders',
          read: true,
          write: true
        },
        {
          key: 'wallets',
          read: true,
          write: false
        }
      ]
      keyPermissions.resolves(permissions)

      const result = await validateKeys(rest)
      expect(result).to.be.true
    })

    it('should handle invalid key exception', async () => {
      const errorStub = new Error()
      errorStub.error = [1010, null, 'apikey: token invalid']
      keyPermissions.rejects(errorStub)

      const result = await validateKeys(rest)
      expect(result).to.be.false
    })

    it('should handle non-api exceptions', async () => {
      const errorStub = new Error()
      keyPermissions.throws(errorStub)

      try {
        await validateKeys(rest)
        assert.fail()
      } catch (e) {
        expect(e).to.eq(errorStub)
      }
    })
  })
})

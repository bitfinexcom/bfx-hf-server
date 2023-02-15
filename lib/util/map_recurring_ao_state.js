'use strict'

const { Recurring } = require('bfx-hf-algo')

module.exports = ({
  _id,
  _symbol,
  action,
  alias,
  label,
  amount,
  createdAt: createdAtDate,
  updatedAt: updatedAtDate,
  currency,
  endedAt,
  endless,
  gid,
  recurrence,
  startedAt,
  status
}) => {
  const algoID = Recurring.id
  const createdAt = new Date(createdAtDate).getTime()

  return {
    recurringAlgoOrderId: _id,
    gid: gid.toString(),
    alias: alias || Recurring.name,
    createdAt,
    algoID,
    state: {
      name: Recurring.name,
      label,
      args: {
        meta: { algoOrderId: algoID },
        symbol: _symbol,
        currency,
        amount,
        action,
        recurrence,
        startedAt: new Date(startedAt),
        ...(endless ? { endless } : {}),
        ...(endedAt ? { endedAt: new Date(endedAt) } : {})
      }
    },
    active: status === 'active',
    lastActive: updatedAtDate ? new Date(updatedAtDate).getTime() : createdAt
  }
}

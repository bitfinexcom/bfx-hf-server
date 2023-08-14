module.exports = {
  DEFAULT_USER: 'HF_User',
  DMS_ENABLED: 4,
  WS_CONNECTION: {
    OPENED: 2,
    CLOSED: 0,
    CONNECTING: 1
  },
  PAPER_PAIR_PREFIX: 'TEST',
  PAPER_MODE_CURRENCIES: new Set(['TESTBTC', 'TESTUSD']),
  WD_PACKET_DELAY: 30 * 1000,
  WD_RECONNECT_DELAY: 3 * 1000,
  HB_INTERVAL_MS: 2500,
  VALID_RECURRING_AO_ACTION_TYPES: ['buy', 'sell'],
  VALID_RECURRING_AO_RECURRENCES: ['daily', 'weekly', 'monthly'],
  RECURRING_ALGO_ORDER_STATUS: ['canceled', 'active'],
  RECURRING_ALGO_ORDER_UPDATABLE_FIELDS: [
    'alias',
    'currency',
    'action',
    'amount',
    'recurrence',
    'endedAt',
    'endless'
  ]
}

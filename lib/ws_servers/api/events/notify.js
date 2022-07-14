const _isObject = require('lodash/isObject')
const _isEmpty = require('lodash/isEmpty')
const _isString = require('lodash/isString')
const { notifySuccess, notifyInfo, notifyError } = require('../../../util/ws/notify')

module.exports = (ws, data) => {
  let [, , , , ucmPayload, , status, text] = data

  // The payload is fluid and can have any format; HF uses level & message
  if (_isObject(ucmPayload) && !_isEmpty(ucmPayload)) {
    status = ucmPayload.level || ucmPayload.type || ucmPayload.status
    text = ucmPayload.message || ucmPayload.msg || ucmPayload.text
  }

  if (!_isString(status) || !_isString(text) || _isEmpty(status) || _isEmpty(text)) {
    return
  }

  switch (status.toLowerCase()) {
    case 'success':
      notifySuccess(ws, text)
      break
    case 'info':
      notifyInfo(ws, text)
      break
    case 'error':
      notifyError(ws, text)
      break
  }
}

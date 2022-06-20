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

  if (_isString(status) && _isString(text) && !_isEmpty(status) && !_isEmpty(text)) {
    if (status.toLowerCase() === 'success') {
      notifySuccess(ws, text)
    } else if (status.toLowerCase() === 'info') {
      notifyInfo(ws, text)
    } else if (status.toLowerCase() === 'error') {
      notifyError(ws, text)
    }
  }
}

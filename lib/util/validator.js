'use strict'

const JoiValidator = (schema, data) => {
  return schema.validate(data, { errors: { label: 'key', wrap: { label: false } } })
}

module.exports = {
  JoiValidator
}

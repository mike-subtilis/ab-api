const { mapValues } = require('../../util/objectUtil');

function getFieldToSet(fieldValue, fieldKey, schema, isUpdate) {
  if (!schema) {
    return fieldValue;
  }
  const fieldDef = schema.properties[fieldKey];
  if (!fieldDef) { return undefined; }

  const connectOrSet = isUpdate ? 'set' : 'connect';
  if (fieldDef.type === 'array' && fieldDef.items.type === 'object') {
    return { [connectOrSet]: fieldValue.map(vi => ({ id: vi })) };
  }
  if (fieldDef.type === 'object') {
    return { [connectOrSet]: { id: fieldValue } };
  }
  return fieldValue;
}

function getFieldsToSet(fields, schema, isUpdate) {
  return mapValues(fields, (v, k) => getFieldToSet(v, k, schema, isUpdate));
}

module.exports = { getFieldToSet, getFieldsToSet };

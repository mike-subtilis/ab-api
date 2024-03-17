const { omit, pick } = require('lodash');

const createObject = (keys, values) => {
  const createdObject = {};

  for (let i = 0; i < keys.length; i += 1) {
    createdObject[keys[i]] = values[i];
  }

  return createdObject;
};

module.exports = { createObject, omit, pick };

// asyncEvery, asyncSome adapted from https://advancedweb.hu/how-to-use-async-functions-with-array-some-and-every-in-javascript/

const { intersection } = require('lodash');

const asyncEvery = async (arr, predicate) => {
  for (let i = 0; i < arr.length; i += 1) {
    const e = arr[i];
    if (!await predicate(e)) { // eslint-disable-line no-await-in-loop
      return false;
    }
  }
  return true;
};

const asyncSome = async (arr, predicate) => {
  for (let i = 0; i < arr.length; i += 1) {
    const e = arr[i];
    if (await predicate(e)) { // eslint-disable-line no-await-in-loop
      return true;
    }
  }
  return false;
};

module.exports = {
  asyncEvery,
  asyncSome,
  intersection,
};

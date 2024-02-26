// asyncEvery, asyncSome adapted from https://advancedweb.hu/how-to-use-async-functions-with-array-some-and-every-in-javascript/

const { difference, intersection, uniq } = require('lodash');

const asyncEvery = async (arr, predicate) => {
  for (let i = 0; i < arr.length; i += 1) {
    const e = arr[i];
    if (!await predicate(e)) { // eslint-disable-line no-await-in-loop
      return false;
    }
  }
  return true;
};

const asyncFilter = async (arr, predicate) => Promise.all(arr.map(predicate))
  .then(results => arr.filter((_v, index) => results[index]));

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
  asyncFilter,
  asyncSome,
  difference,
  intersection,
  uniq,
};

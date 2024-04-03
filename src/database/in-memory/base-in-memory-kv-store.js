module.exports.create = () => { // also passed: logger
  const kvStore = {};

  async function get(key) {
    return kvStore[key];
  }

  async function set(key, value) {
    kvStore[key] = value;
    return value;
  }

  async function pop(key) {
    const value = kvStore[key];
    if (value) {
      delete kvStore.key;
    }
    return value;
  }

  return { get, set, pop };
};

module.exports.create = (client, configuration) => { // also passed: logger
  const { entityType, expiry } = configuration;

  function getRedisKey(key) {
    if (entityType) {
      return `${entityType}:${key}`;
    }
    return key;
  }

  async function get(key) {
    const value = await client.get(getRedisKey(key));
    return JSON.parse(value);
  }

  async function set(key, value) {
    const redisKey = getRedisKey(key);
    await client.set(redisKey, JSON.stringify(value));
    if (expiry) {
      await client.expire(redisKey, expiry);
    }
    return value;
  }

  async function pop(key) {
    const redisKey = getRedisKey(key);
    const value = await client.get(redisKey);
    if (value) {
      await client.del(redisKey);
      return JSON.parse(value);
    }
    return null;
  }

  return { get, set, pop };
};

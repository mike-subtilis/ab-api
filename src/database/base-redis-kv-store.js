module.exports.create = (client, entityType) => { // also passed: logger
  function getRedisKey(key) {
    return `${entityType}:${key}`;
  }

  async function get(key) {
    const value = await client.get(getRedisKey(key));
    return JSON.parse(value);
  }

  async function set(key, value) {
    const redisKey = getRedisKey(key);
    await client.set(redisKey, JSON.stringify(value));
    await client.expire(redisKey, 3600); // expire in 1 hour
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

const { getHash } = require('./crypto-util');

const DEFAULT_EXPIRY = 1000 * 60 * 10; // 10 minutes
const DEFAULT_CLEANUP_INTERVAL = 1000 * 60 * 60; // 1 hour
const defaultConstructorOptions = {
  expiry: DEFAULT_EXPIRY,
  cleanupInterval: DEFAULT_CLEANUP_INTERVAL,
};

module.exports.create = (underlyingRepo, constructorOptions) => {
  const safeConstructorOptions = {
    ...defaultConstructorOptions,
    ...constructorOptions,
  };

  const cache = {};
  const cacheExpiry = {};
  const cacheKeysById = {};

  if (safeConstructorOptions.cleanupInterval) {
    setInterval(() => {
      const currentTime = new Date().getTime();
      const expiredKeys = Object.keys(cacheExpiry).filter(k => cacheExpiry[k] < currentTime);
      expiredKeys.forEach((k) => {
        delete cache[k];
        delete cacheExpiry[k];
      });
    }, safeConstructorOptions.cleanupInterval);
  }

  function addToCache(cacheKey, result) {
    if (result) {
      cache[cacheKey] = result;
      cacheExpiry[cacheKey] = new Date().getTime() + safeConstructorOptions.expiry;
      cacheKeysById[result.id] = cacheKeysById[result.id]
        ? [...cacheKeysById[result.id], cacheKey]
        : [cacheKey];
    }
  }

  function invalidateCacheKeys(id) {
    (cacheKeysById[id] || []).forEach((k) => {
      delete cache[k];
      delete cacheExpiry[k];
    });
    delete cacheKeysById[id];
  }

  async function get(id, queryOptions) {
    const cacheKey = getHash('get', id, queryOptions);
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }
    const result = await underlyingRepo.get(id, queryOptions);
    addToCache(cacheKey, result);
    return result;
  }

  async function getUnique(fieldName, uniqueValue) {
    const cacheKey = getHash('getUnique', fieldName, uniqueValue);
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }
    const result = await underlyingRepo.getUnique(fieldName, uniqueValue);
    addToCache(cacheKey, result);
    return result;
  }

  async function create(newFields, currentUser) {
    const result = await underlyingRepo.create(newFields, currentUser);
    return result;
  }

  async function update(id, etag, fields, currentUser) {
    const result = await underlyingRepo.update(id, etag, fields, currentUser);
    invalidateCacheKeys(id);
    return result;
  }

  async function deleteEntity(id, etag, currentUser) {
    await underlyingRepo.delete(id, etag, currentUser);
    invalidateCacheKeys(id);
  }

  return {
    getCount: underlyingRepo.getCount,
    getDistinct: underlyingRepo.getDistinct,
    getPage: underlyingRepo.getPage,
    get,
    getUnique,
    create,
    update,
    delete: deleteEntity,
  };
};

const crypto = require('crypto');

module.exports.create = (client, configuration) => { // also passed: logger
  const { entityType, expiry } = configuration;

  /*
    await client.ft.create(`idx:${entityType}`,
      schema,
      {
        ON: 'JSON',
        PREFIX: `${entityType}:`
      });
  */
  function getRedisKey(key) {
    if (entityType) {
      if (key.startsWith(`${entityType}:`)) {
        return key;
      }
      return `${entityType}:${key}`;
    }
    return key;
  }

  async function getCount() {
    throw new Error('Not Implemented');
  }

  async function getPage(pageNumber, pageSize) { // also passed: queryOptions
    const result = await client.ft.search(
      `idx:${entityType}`,
      '*',
      {
        LIMIT: {
          from: (pageNumber - 1) * pageSize,
          size: pageSize,
        },
      },
    );

    return result.documents;
  }

  async function get(id) {
    const value = client.json.get(getRedisKey(id));
    return value;
  }

  async function create(fields, currentUser) {
    const id = fields.id || crypto.randomUUID();
    const redisKey = getRedisKey(id);
    const attributionDate = new Date().toISOString();
    const attributedAndIdFields = {
      ...fields,
      id,
      createdAt: attributionDate,
      createdBy: currentUser?.id,
      createdByUserName: currentUser?.name,
      updatedAt: attributionDate,
      updatedBy: currentUser?.id,
      updatedByUserName: currentUser?.name,
    };

    await client.json.set(redisKey, '$', attributedAndIdFields);
    if (expiry) {
      await client.expire(redisKey, expiry);
    }
    return attributedAndIdFields;
  }

  async function update(id, eTag, fields, currentUser) {
    const redisKey = getRedisKey(id);
    const existingItem = await client.get(redisKey);
    if (!existingItem) {
      throw new ReferenceError(`Item '${redisKey}' does not exist.`);
    }
    if (existingItem._etag !== eTag) {
      throw new ReferenceError(`Item '${redisKey}' has been updated by another user.`);
    }

    const updatedFields = {
      ...existingItem,
      ...fields,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedByUserName: currentUser.name,
    };

    await client.json.set(redisKey, '$', updatedFields);
    if (expiry) {
      await client.expire(redisKey, expiry);
    }

    return updatedFields;
  }

  async function deleteEntity(id, eTag) {
    const redisKey = getRedisKey(id);
    const existingItem = client.json.get(redisKey);
    if (!existingItem) {
      throw new ReferenceError(`Item '${redisKey}' does not exist.`);
    }
    if (existingItem._etag !== eTag) {
      throw new ReferenceError(`Item '${redisKey}' has been updated by another user.`);
    }

    await client.del(redisKey);
  }

  return { getCount, getPage, get, create, update, delete: deleteEntity };
};

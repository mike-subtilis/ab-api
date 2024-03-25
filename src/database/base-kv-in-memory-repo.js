const crypto = require('crypto');

module.exports.create = () => { // also passed: logger
  const kvStore = {};

  async function get(id) {
    return kvStore[id];
  }

  async function create(fields, currentUser) {
    const attributionDate = new Date().toISOString();
    const attributedAndIdFields = {
      id: crypto.randomUUID(),
      ...fields,
      createdAt: attributionDate,
      createdBy: currentUser?.id,
      createdByUserName: currentUser?.name,
      updatedAt: attributionDate,
      updatedBy: currentUser?.id,
      updatedByUserName: currentUser?.name,
    };

    kvStore[attributedAndIdFields.id] = attributedAndIdFields;
    return attributedAndIdFields;
  }

  async function update(id, eTag, fields, currentUser) {
    const existingItem = kvStore[id];
    if (!existingItem) {
      throw new ReferenceError(`Item '${id}' does not exist.`);
    }
    if (existingItem._etag !== eTag) {
      throw new ReferenceError(`Item '${id}' has been updated by another user.`);
    }

    const updatedFields = {
      ...existingItem,
      ...fields,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedByUserName: currentUser.name,
    };

    kvStore[id] = updatedFields;

    return updatedFields;
  }

  async function deleteEntity(id, eTag) {
    const existingItem = kvStore[id];
    if (!existingItem) {
      throw new ReferenceError(`Item '${id}' does not exist.`);
    }
    if (existingItem._etag !== eTag) {
      throw new ReferenceError(`Item '${id}' has been updated by another user.`);
    }

    delete kvStore[id];
  }

  return {
    get,
    create,
    update,
    delete: deleteEntity,
  };
};

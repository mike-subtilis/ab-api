const crypto = require('crypto');

module.exports.create = (prismaClient, configuration) => {
  const { entityType } = configuration;
  const table = prismaClient[entityType];

  async function getCount() {
    const count = await table.count({ });
    return count;
  }

  async function getPage() {
    const docs = await table.findMany({ });
    return docs;
  }

  async function get(id) {
    const doc = await table.findUnique({ where: { id } });
    return doc;
  }

  async function create(newFields, currentUser) {
    const attributedAndIdFields = {
      id: crypto.randomUUID(),
      ...newFields,
      etag: crypto.randomUUID(),
      ownedBy: currentUser?.id,
    };

    const newDoc = await table.create({
      data: attributedAndIdFields,
    });
    return newDoc;
  }

  async function update(id, etag, fields) { // also passed: currentUser
    const updatedFields = {
      ...fields,
      etag: crypto.randomUUID(),
    };

    const updatedDoc = await table.update({
      where: { id, etag },
      data: updatedFields,
    });

    return updatedDoc;
  }

  async function deleteEntity() { // also passed: id, eTag, currentUser
    throw new Error('Not implemented');
  }

  return { getCount, getPage, get, create, update, delete: deleteEntity };
};

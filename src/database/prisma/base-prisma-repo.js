const crypto = require('crypto');

module.exports.create = (prismaClient, configuration, logger) => {
  const { entityType } = configuration;
  const table = prismaClient[entityType];

  async function getCount() {
    const count = await table.count({ });
    return count;
  }

  async function getPage(pageNumber, pageSize, queryOptions) {
    logger.trace(`${entityType}.getPage(${pageNumber}, ${pageSize}, ${JSON.stringify(queryOptions)})...`);
    const docs = await table.findMany({
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      where: queryOptions || {}
    });
    return docs;
  }

  async function get(id) {
    const doc = await table.findUnique({ where: { id } });
    return doc;
  }

  async function create(newFields, currentUser) {
    logger.trace('create ' + JSON.stringify(newFields));
    const attributedAndIdFields = {
      id: crypto.randomUUID(),
      ...newFields,
      etag: crypto.randomUUID(),
      createdBy: currentUser?.id,
      updatedBy: currentUser?.id,
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
      updatedBy: currentUser?.id,
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

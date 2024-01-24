const crypto = require('crypto');

module.exports.create = (container, partitionField, createPartitionValue) => {
  const safeCreatePartitionValue = createPartitionValue || (v => v.id);

  async function getPage(pageNumber, pageSize, queryOptions) {
    const filterTokens = Object.keys(queryOptions).map(k => `r.${k} = @${k}`);

    const optionalPartitionClause = filterTokens.length
      ? `WHERE ${filterTokens.join(', ')}`
      : '';
    const optionalPartitionParam = filterTokens.length
      ? Object.keys(queryOptions).map(k => ({ name: `@${k}`, value: queryOptions[k] }))
      : [];
    const queryString = `SELECT * FROM root r
      ${optionalPartitionClause}
      OFFSET ${(pageNumber - 1) * pageSize} LIMIT ${pageSize}`;
    console.log(`Querying '${queryString}'...`);

    const { resources: results } = await container
      .items
      .query({
        query: queryString,
        parameters: [...optionalPartitionParam],
      })
      .fetchAll();

    return results;
  }

  async function get(id, partitionValue) {
    const { resource: result } = await container
      .item(id, partitionValue)
      .read();

    return result;
  }

  async function create(partitionValue, fields) {
    const attributionDate = new Date().toISOString();
    const attributedAndIdFields = {
      id: crypto.randomUUID(),
      ...fields,
      createdAt: attributionDate,
      updatedAt: attributionDate,
    };
    attributedAndIdFields[partitionField] = partitionValue || safeCreatePartitionValue(attributedAndIdFields);

    const { addedItem } = await container
      .items
      .upsert(attributedAndIdFields);

    return addedItem;
  }

  async function update(id, partitionValue, eTag, fields) {
    const itemRef = container.item(id, partitionValue);

    const { resource: existingItem } = await itemRef.read();

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
    };
    const { updatedItem } = await itemRef
      .replace(updatedFields, { accessCondition: { type: 'IfMatch', condition: eTag } });

    return updatedItem;
  }

  async function deleteEntity(id, partitionValue, eTag) {
    const itemRef = container.item(id, partitionValue);

    const { resource: existingItem } = await itemRef.read();

    if (!existingItem) {
      throw new ReferenceError(`Item '${id}' does not exist.`);
    }
    if (existingItem._etag !== eTag) {
      throw new ReferenceError(`Item '${id}' has been updated by another user.`);
    }

    await itemRef.delete({ accessCondition: { type: 'IfMatch', condition: eTag } });
  }

  return {
    partitionField,
    getPage,
    get,
    create,
    update,
    delete: deleteEntity,
  };
};

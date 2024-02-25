const crypto = require('crypto');

module.exports.create = (container, constructorOptions) => {
  const { partitionField, createPartitionValue, migrations } = constructorOptions;
  const safeCreatePartitionValue = createPartitionValue || (v => v.id);

  async function getPage(pageNumber, pageSize, queryOptions) {
    const filterTokens = Object.keys(queryOptions)
      .filter(k => !!queryOptions[k])
      .map(k => `r.${k} = @${k}`);

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

    if (migrations) {
      return results.map(migrations.migrateUpAll);
    }

    return results;
  }

  async function get(id, partitionValue) {
    const safePartitionValue = partitionValue
      || safeCreatePartitionValue({ id });

    const { resource: result } = await container
      .item(id, safePartitionValue)
      .read();

    if (migrations) {
      return migrations.migrateUpAll(result);
    }
    return result;
  }

  async function create(fields, currentUser, partitionValue) {
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
    attributedAndIdFields[partitionField] = partitionValue
      || fields[partitionField]
      || safeCreatePartitionValue(attributedAndIdFields);

    const { resource: createdUser } = await container
      .items
      .upsert(attributedAndIdFields);

    return createdUser;
  }

  async function update(id, eTag, fields, currentUser, partitionValue) {
    const safePartitionValue = partitionValue
      || safeCreatePartitionValue({ ...fields, id });

    const itemRef = container.item(id, safePartitionValue);

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
      updatedBy: currentUser.id,
      updatedByUserName: currentUser.name,
    };
    const { resource: updatedItem } = await itemRef
      .replace(updatedFields, { accessCondition: { type: 'IfMatch', condition: eTag } });

    return updatedItem;
  }

  async function deleteEntity(id, eTag, currentUser, partitionValue) {
    const safePartitionValue = partitionValue
      || safeCreatePartitionValue({ id });

    const itemRef = container.item(id, safePartitionValue);

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

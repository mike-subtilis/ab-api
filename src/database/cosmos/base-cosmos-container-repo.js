const crypto = require('crypto');

module.exports.create = async (cosmosDb, constructorOptions, logger) => {
  const {
    containerName,
    partitionField,
    createPartitionValue,
    schema,
    migrations,
  } = constructorOptions;

  await cosmosDb
    .containers
    .createIfNotExists({ id: containerName, partitionKey: { kind: 'Hash', paths: [`/${partitionField}`] } });

  const container = cosmosDb.container(containerName);
  const safeCreatePartitionValue = createPartitionValue || (v => v.id);

  function isFilterProvided(fieldDef, filterValue) {
    switch (fieldDef.type) {
      case 'string':
      case 'array':
        return (typeof filterValue === 'string' && !!filterValue)
          || (Array.isArray(filterValue) && filterValue.length > 0);
      case 'boolean':
        return (typeof filterValue === 'boolean');
      default:
        return false;
    }
  }

  function formatFilterClause(k, fieldDef, filterValue, useFilterValueParams = true) {
    const renderedFilterValue = useFilterValueParams
      ? `@${k}`
      : `${JSON.stringify(filterValue)}`;
    switch (fieldDef.type) {
      case 'string':
        if (Array.isArray(filterValue)) {
          return `ARRAY_CONTAINS(${renderedFilterValue}, r.${k})`;
        }
        return `CONTAINS(r.${k}, ${renderedFilterValue}, true)`;

      case 'array':
        if (Array.isArray(filterValue)) {
          // intersection
          return `ARRAY_LENGTH(SetIntersect(r.${k}, ${renderedFilterValue})) = ${filterValue.length}`;
        }
        return `ARRAY_CONTAINS(r.${k}, ${renderedFilterValue})`;

      case 'boolean':
        return `r.${k} = ${renderedFilterValue}`;

      default:
        return null;
    }
  }

  function renderAuthorizationFilter(authorizationFilter) {
    const filterComponents = Object
      .keys(authorizationFilter)
      .map((k) => {
        if (schema) {
          return formatFilterClause(k, schema.properties[k], authorizationFilter[k], false);
        }
        return `r.${k} = ${JSON.stringify(authorizationFilter[k])}`;
      });
    return `(${filterComponents.join(' AND ')})`;
  }

  function extractAuthorizationFilterClause(authorizationFilters) {
    if (!authorizationFilters || authorizationFilters.length === 0) {
      return null;
    }

    const authorizationOptions = authorizationFilters.map(f => renderAuthorizationFilter(f));
    const combinedAuthorizationOptions = authorizationOptions.join(' OR ');
    return `(${combinedAuthorizationOptions})`;
  }

  function extractFilterInfo(queryOptions) {
    let filterClauses;
    if (schema) {
      const validFilterKeys = Object.keys(schema.properties);
      const validProvidedFilterKeys = validFilterKeys
        .filter(k => isFilterProvided(schema.properties[k], queryOptions[k]));
      filterClauses = validProvidedFilterKeys
        .map(k => formatFilterClause(k, schema.properties[k], queryOptions[k]))
        .filter(c => !!c);
    } else {
      filterClauses = Object.keys(queryOptions)
        .filter(k => !!queryOptions[k])
        .map(k => `r.${k} = @${k}`);
    }

    const authorizationFilterClause = extractAuthorizationFilterClause(queryOptions.authorizationFilters);
    const allFilterClauses = authorizationFilterClause
      ? [...filterClauses, authorizationFilterClause]
      : filterClauses;

    const optionalFilterClause = allFilterClauses.length
      ? `WHERE ${allFilterClauses.join(' AND ')}`
      : '';
    const optionalFilterParam = filterClauses.length
      ? Object.keys(queryOptions).map(k => ({ name: `@${k}`, value: queryOptions[k] }))
      : [];

    return {
      whereClause: optionalFilterClause,
      params: optionalFilterParam,
    };
  }

  function extractSortClause(queryOptions) {
    if (!queryOptions.sort) {
      return '';
    }
    if (queryOptions.sort.startsWith('-')) {
      return `ORDER BY r.${queryOptions.sort.substring(1)} DESC`;
    }
    return `ORDER BY r.${queryOptions.sort}`;
  }

  async function getCount(queryOptions) { // also passed: currentUser
    const filterInfo = extractFilterInfo(queryOptions);

    const queryString = `SELECT VALUE COUNT(1) FROM root r
      ${filterInfo.whereClause}`;

    const { resources } = await container
      .items
      .query({
        query: queryString,
        parameters: [...filterInfo.params],
      })
      .fetchAll();

    const [count] = resources;
    return count;
  }

  async function getPage(pageNumber, pageSize, queryOptions) { // also passed: currentUser
    const filterInfo = extractFilterInfo(queryOptions);

    const sortClause = extractSortClause(queryOptions);
    const pageClause = `OFFSET ${(pageNumber - 1) * pageSize} LIMIT ${pageSize}`;
    const queryString = `SELECT * FROM root r
      ${filterInfo.whereClause} ${sortClause} ${pageClause}`;
    logger.trace(`Querying '${queryString}'...`);

    const { resources: results } = await container
      .items
      .query({
        query: queryString,
        parameters: [...filterInfo.params],
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

  async function getUnique(fieldName, uniqueValue) { // also passed: currentUser
    const queryString = `SELECT * FROM root r
      WHERE r.${fieldName} = @uniqueValue OFFSET 0 LIMIT 1`;
    logger.trace(`Querying '${queryString}'...`);

    const { resources: results } = await container
      .items
      .query({
        query: queryString,
        parameters: [{ name: `@${uniqueValue}`, value: uniqueValue }],
      })
      .fetchAll();

    let migratedResults = results;
    if (migrations) {
      migratedResults = results.map(migrations.migrateUpAll);
    }

    if (migratedResults.length === 1) {
      return migratedResults[0];
    }
    return null;
  }

  async function create(fields, currentUser, partitionValue) {
    const attributionDate = new Date().toISOString();
    const attributedAndIdFields = {
      __schemaVersion: migrations ? migrations.currentSchemaVersion : 0,
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

    const { resource: createdItem } = await container
      .items
      .upsert(attributedAndIdFields);

    return createdItem;
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
    getCount,
    getPage,
    get,
    getUnique,
    create,
    update,
    delete: deleteEntity,
  };
};

const crypto = require('crypto');
const prismaUtil = require('./prisma-util');

module.exports.create = async (prismaClient, configuration, logger) => {
  const {
    entityType,
    idField = 'id',
    schema,
    usesETag = true,
    usesAttribution = true,
    defaultInclude,
    defaultSelect,
    fieldSetters,
  } = configuration;
  const table = prismaClient[entityType];

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

  function formatFilter(k, fieldDef, filterValue) {
    switch (fieldDef.type) {
      case 'string':
        if (fieldDef.enum) {
          if (Array.isArray(filterValue)) {
            return { [k]: { in: filterValue } };
          }
          return { [k]: filterValue };
        }
        if (Array.isArray(filterValue)) {
          return { OR: filterValue.map(v => ({ [k]: { contains: v, mode: 'insensitive' } })) };
        }
        return { [k]: { contains: filterValue, mode: 'insensitive' } };

      case 'array':
        if (Array.isArray(filterValue)) {
          if (fieldDef.items.type === 'object') {
            return { [k]: { hasSome: filterValue.map(v => ({ id: v })) } };
          }
          // intersection
          return { [k]: { hasSome: filterValue } };
        }
        if (fieldDef.items.type === 'object') {
          return { [k]: { some: { id: filterValue } } };
        }
        return { [k]: { has: filterValue } };

      case 'boolean':
        return { [k]: filterValue };

      case 'number':
        if (Array.isArray(filterValue)) {
          if (filterValue.length === 2) {
            let gte = {};
            let lte = {};
            if (filterValue[0] || filterValue[0] === 0) {
              gte = { gte: filterValue[0] };
            }
            if (filterValue[1] || filterValue[1] === 0) {
              lte = { lte: filterValue[1] };
            }
            return { [k]: { ...gte, ...lte } };
          }
          return null;
        }
        return { [k]: filterValue };

      default:
        return null;
    }
  }

  function renderAuthorizationFilter(authorizationFilter) {
    const filterComponents = Object
      .keys(authorizationFilter)
      .map((k) => {
        if (schema) {
          return formatFilter(k, schema.properties[k], authorizationFilter[k], false);
        }
        return { [k]: authorizationFilter[k] };
      });
    const and = filterComponents.reduce((memo, f) => ({ ...memo, ...f }), {});
    return and;
  }

  function extractAuthorizationFilters(authorizationFilters) {
    if (!authorizationFilters || authorizationFilters.length === 0) {
      return null;
    }

    const authorizationOptions = authorizationFilters.map(f => renderAuthorizationFilter(f));
    if (authorizationOptions.length === 0) {
      return {};
    }
    if (authorizationOptions.length === 1) {
      return authorizationOptions[0];
    }
    return { OR: authorizationOptions };
  }

  function extractFilterInfo(queryOptions) {
    let filters;
    if (schema) {
      const validFilterKeys = Object.keys(schema.properties);
      const validProvidedFilterKeys = validFilterKeys
        .filter(k => isFilterProvided(schema.properties[k], queryOptions[k]));
      filters = validProvidedFilterKeys
        .map(k => formatFilter(k, schema.properties[k], queryOptions[k]))
        .filter(c => !!c);
    } else {
      filters = Object.keys(queryOptions)
        .filter(k => k !== 'sort')
        .filter(k => !!queryOptions[k])
        .map(k => ({ [k]: queryOptions[k] }));
    }

    const authorizationFilters = extractAuthorizationFilters(queryOptions.authorizationFilters);
    const allFilters = authorizationFilters
      ? [...filters, authorizationFilters]
      : filters;

    if (allFilters.length === 0) {
      return {};
    }

    const overallFilter = allFilters.reduce((memo, f) => ({ ...memo, ...f }), {});
    return { where: overallFilter };
  }

  function extractSortInfo(queryOptions) {
    if (!queryOptions.sort) {
      return {};
    }
    if (queryOptions.sort.startsWith('-')) {
      return { orderBy: { [queryOptions.sort.substring(1)]: 'desc' } };
    }
    return { orderBy: { [queryOptions.sort]: 'asc' } };
  }

  function extractIncludeAndSelectInfo(queryOptions) {
    const includeAndSelect = {};
    const include = queryOptions.include || defaultInclude;
    const select = queryOptions.select || defaultSelect;
    if (include) { includeAndSelect.include = include; }
    if (select) { includeAndSelect.select = select; }
    return includeAndSelect;
  }

  async function getCount(queryOptions) { // also passed: currentUser
    logger.trace(`${entityType}.getCount(${JSON.stringify(queryOptions)})...`);
    const whereInfo = extractFilterInfo(queryOptions);

    const count = await table.count({ ...whereInfo });
    return count;
  }

  async function getDistinct(fieldName, queryOptions) { // also passed: currentUser
    logger.trace(`${entityType}.getDistinct(${fieldName}, ${JSON.stringify(queryOptions)})...`);
    const whereInfo = extractFilterInfo(queryOptions);

    const results = await table.findMany({
      distinct: [fieldName],
      ...whereInfo,
      select: { [fieldName]: true },
    });

    return results.map(r => r[fieldName]);
  }

  async function getPage(pageNumber, pageSize, queryOptions) { // also passed: currentUser
    logger.trace(`${entityType}.getPage(${pageNumber}, ${pageSize}, ${JSON.stringify(queryOptions)})...`);
    const sortInfo = extractSortInfo(queryOptions);
    const whereInfo = extractFilterInfo(queryOptions);
    const includeAndSelectInfo = extractIncludeAndSelectInfo(queryOptions);

    const findManyOptions = {
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      ...sortInfo,
      ...whereInfo,
      ...includeAndSelectInfo,
    };
    const docs = await table.findMany(findManyOptions);
    return docs;
  }

  async function get(id, queryOptions) { // also passed: currentUser
    const includeAndSelectInfo = extractIncludeAndSelectInfo(queryOptions || {});

    const doc = await table.findUnique({
      where: { [idField]: id },
      ...includeAndSelectInfo,
    });
    return doc;
  }

  async function getUnique(fieldName, uniqueValue) { // also passed: currentUser
    const doc = await table.findUnique({ where: { [fieldName]: uniqueValue } });
    return doc;
  }

  async function create(newFields, currentUser) {
    const attributedAndIdFields = {
      [idField]: crypto.randomUUID(),
      ...prismaUtil.getFieldsToSet(newFields, schema, fieldSetters),
      ...(usesETag ? { etag: crypto.randomUUID() } : {}),
      ...(
        usesAttribution
          ? {
            createdBy: currentUser?.id,
            updatedBy: currentUser?.id,
          }
          : {}
      ),
    };

    const newDoc = await table.create({
      data: attributedAndIdFields,
    });
    return newDoc;
  }

  async function update(id, etag, fields, currentUser) {
    const updatedFields = {
      ...prismaUtil.getFieldsToSet(fields, schema, fieldSetters, true),
      ...(usesETag ? { etag: crypto.randomUUID() } : {}),
      ...(usesAttribution ? { updatedBy: currentUser?.id } : {}),
    };

    const updatedDoc = await table.update({
      where: { [idField]: id, ...(usesETag ? { etag } : {}) },
      data: updatedFields,
    });

    return updatedDoc;
  }

  async function deleteEntity() { // also passed: id, eTag, currentUser
    throw new Error('Not implemented');
  }

  return { getCount, getDistinct, getPage, get, getUnique, create, update, delete: deleteEntity };
};

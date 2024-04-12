const tagHandlerFactory = require('./tag-handler');

module.exports.create = (repo, logger) => {
  const tagHandler = tagHandlerFactory.create(repo, logger);

  function transformTagObjects(question) {
    return {
      ...question,
      tags: (question.tags || []).map(t => t.display),
    };
  }

  async function getPage(page, pageSize, queryOptions, currentUser) {
    const results = await repo.question.getPage(
      page,
      pageSize,
      { ...queryOptions },
      currentUser,
    );
    return results.map(q => transformTagObjects(q));
  }

  async function get(id) {
    const question = await repo.question.get(id);
    return transformTagObjects(question);
  }

  async function create(fields, currentUser) {
    await tagHandler.ensureAllAreCreated(fields.tags, currentUser);
    const maybeTagIds = fields.tags ? { tags: fields.tags.map(t => t.toLowerCase()) } : {};
    const fieldsWithMaybeTagIds = { ...fields, ...maybeTagIds };
    const results = await repo.question.create(fieldsWithMaybeTagIds, currentUser);

    return results;
  }

  async function update(id, etag, fields, currentUser) {
    await tagHandler.ensureAllAreCreated(fields.tags, currentUser);
    const maybeTagIds = fields.tags ? { tags: fields.tags.map(t => t.toLowerCase()) } : {};
    const fieldsWithMaybeTagIds = { ...fields, ...maybeTagIds };

    const results = await repo.question.update(id, etag, fieldsWithMaybeTagIds, currentUser);

    return results;
  }

  return { getPage, get, create, update };
};

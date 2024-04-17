const tagHandlerFactory = require('./tag-handler');

module.exports.create = (repo, logger) => {
  const tagHandler = tagHandlerFactory.create(repo, logger);

  function translateQueryOptions(queryOptions) {
    // this is bleeding db implementation syntax and should be moved to the repo
    if (queryOptions.includeQuestionIds) {
      return {
        ...queryOptions,
        include: {
          ...queryOptions.include,
          questions: { select: { id: true } },
        },
      };
    }

    return queryOptions;
  }

  function translateAnswerResult(answer, queryOptions) {
    // this is bleeding db implementation syntax and should be moved to the repo
    const maybeQuestionIds = queryOptions.includeQuestionIds
      ? { questionIds: answer.questions.map(q => q.id) }
      : {};
    return {
      ...answer,
      ...maybeQuestionIds,
      tags: tagHandler.transformTagObjectsToDisplay(answer.tags),
    };
  }

  async function getPage(page, pageSize, queryOptions, currentUser) {
    const translatedQueryOptions = translateQueryOptions(queryOptions);

    const results = await repo.answer.getPage(
      page,
      pageSize,
      translatedQueryOptions,
      currentUser,
    );
    return results.map(a => translateAnswerResult(a, queryOptions));
  }

  async function get(id, queryOptions) {
    const translatedQueryOptions = translateQueryOptions(queryOptions);

    const answer = await repo.answer.get(id, translatedQueryOptions);
    return translateAnswerResult(answer, queryOptions);
  }

  async function create(fields, currentUser) {
    await tagHandler.ensureAllAreCreated(fields.tags, currentUser);
    const maybeTagIds = fields.tags ? { tags: fields.tags.map(t => t.toLowerCase()) } : {};
    const fieldsWithMaybeTagIds = { ...fields, ...maybeTagIds };
    const results = await repo.answer.create(fieldsWithMaybeTagIds, currentUser);

    return results;
  }

  async function update(id, etag, fields, currentUser) {
    await tagHandler.ensureAllAreCreated(fields.tags, currentUser);
    const maybeTagIds = fields.tags ? { tags: fields.tags.map(t => t.toLowerCase()) } : {};
    const fieldsWithMaybeTagIds = { ...fields, ...maybeTagIds };

    const results = await repo.answer.update(id, etag, fieldsWithMaybeTagIds, currentUser);

    return results;
  }

  return { getPage, get, create, update };
};

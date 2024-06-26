const tagHandlerFactory = require('./tag-handler');

module.exports.create = (repo, logger) => {
  const tagHandler = tagHandlerFactory.create(repo, logger);

  function translateQueryOptions(queryOptions) {
    // this is bleeding db implementation syntax and should maybe be moved to the repo
    if (queryOptions.includeAnswerCount) {
      return {
        ...queryOptions,
        include: {
          ...queryOptions.include,
          _count: { select: { answers: true } },
        },
      };
    }

    return queryOptions;
  }

  function translateQuestionResult(question) {
    const maybeAnswerCount = question._count
      ? { answerCount: question._count.answers }
      : {};
    const translatedQuestion = {
      ...question,
      ...maybeAnswerCount,
      tags: tagHandler.transformTagObjectsToDisplay(question.tags),
    };

    return translatedQuestion;
  }

  async function getPage(page, pageSize, queryOptions, currentUser) {
    const translatedQueryOptions = translateQueryOptions(queryOptions);

    const results = await repo.question.getPage(
      page,
      pageSize,
      translatedQueryOptions,
      currentUser,
    );

    return results.map(translateQuestionResult);
  }

  async function get(id, queryOptions) {
    const translatedQueryOptions = translateQueryOptions(queryOptions);

    const question = await repo.question.get(id, translatedQueryOptions);
    return translateQuestionResult(question);
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

module.exports.create = (repo, logger) => {
  async function ensureAllAreCreated(tags, currentUser) {
    logger.trace(`ensureAllAreCreated(${JSON.stringify(tags)})...`);
    if (tags) {
      const tagKeys = tags.map(t => t.toLowerCase());
      const existingTags = await repo.tag.getPage(1, tags.length, { id: tagKeys });
      const existingTagKeys = (existingTags || []).map(t => t.id);
      const tagsToAdd = tags.filter(t => !existingTagKeys.includes(t.toLowerCase()));

      logger.debug(`Adding ${tagsToAdd.length} new tags: [${tagsToAdd.slice(0, 3)}${tagsToAdd.length > 3 ? '...' : ''}]...`);
      await Promise.all(tagsToAdd.map(t => repo.tag.create({ id: t.toLowerCase(), display: t }, currentUser)));
    }
  }

  return { ensureAllAreCreated };
};

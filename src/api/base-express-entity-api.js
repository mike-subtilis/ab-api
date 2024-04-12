const express = require('express');
const { omit } = require('../util/objectUtil');

module.exports.create = (constructorOptions) => {
  const {
    repo,
    entityHandler,
    authorizer,
    entityType,
    options = {},
  } = constructorOptions;

  const router = express.Router();
  const entityRepo = repo[entityType];

  router.get('/count', authorizer.filter(`${entityType}:list`), async (req, res) => {
    const count = await entityRepo.getCount({ ...req.query, authorizationFilters: req.authorizationFilters }, req.user);
    res.json(count);
  });

  router.get('/', authorizer.filter(`${entityType}:list`), async (req, res) => {
    const { page = 1, pageSize = 25, ...rest } = req.query;
    const results = (entityHandler && entityHandler.getPage)
      ? await entityHandler.getPage(page, pageSize, { ...rest, authorizationFilters: req.authorizationFilters }, req.user)
      : await entityRepo.getPage(page, pageSize, { ...rest, authorizationFilters: req.authorizationFilters }, req.user);
    res.json(results);
  });

  router.get('/:id', authorizer.check(`${entityType}:read`), async (req, res) => {
    const results = (entityHandler && entityHandler.get)
      ? await entityHandler.get(req.params.id)
      : await entityRepo.get(req.params.id);
    res.json(results);
  });

  if (!options.readOnly) {
    router.post('/', authorizer.check(`${entityType}:create`), async (req, res) => {
      const results = (entityHandler && entityHandler.create)
        ? await entityHandler.create(req.body, req.user)
        : await entityRepo.create(req.body, req.user);
      res.json(results);
    });

    router.put('/:id', authorizer.check(`${entityType}:update`), async (req, res) => {
      const cleanBody = omit(req.body, ['id', 'etag', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy']);
      const results = (entityHandler && entityHandler.update)
        ? await entityHandler.update(req.params.id, req.query.etag, cleanBody, req.user)
        : await entityRepo.update(req.params.id, req.query.etag, cleanBody, req.user);
      res.json(results);
    });

    router.delete('/:id', authorizer.check(`${entityType}:delete`), async (req, res) => {
      await entityRepo.delete(req.params.id, req.query.etag, req.user);
      res.sendStatus(200);
    });
  }

  return router;
};

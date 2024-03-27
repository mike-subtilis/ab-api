const express = require('express');

module.exports.create = (constructorOptions) => {
  const {
    repo,
    authorizer,
    entityType,
    options = {},
  } = constructorOptions;
  const router = express.Router();
  const entityRepo = repo[entityType];

  router.get('/count', authorizer.filter(`${entityType}:list`), async (req, res) => {
    const count = await entityRepo.getCount({ ...req.query, authorizationFilters: req.authorizationFilters }, req.user)
    res.json(count);
  });

  router.get('/', authorizer.filter(`${entityType}:list`), async (req, res) => {
    const { page = 1, pageSize = 25, ...rest } = req.query;
    const results = await entityRepo.getPage(page, pageSize, { ...rest, authorizationFilters: req.authorizationFilters }, req.user)
    res.json(results);
  });

  router.get('/:id', authorizer.check(`${entityType}:read`), async (req, res) => {
    const results = await entityRepo.get(req.params.id, req.query[entityRepo.partitionField])
    res.json(results);
  });

  if (!options.readOnly) {
    router.post('/', authorizer.check(`${entityType}:create`), async (req, res) => {
      const results = await entityRepo.create(req.body, req.user, req.query[entityRepo.partitionField])
      res.json(results);
    });

    router.put('/:id', authorizer.check(`${entityType}:update`), async (req, res) => {
      const results = await entityRepo.update(req.params.id, req.query.etag, req.body, req.user, req.query[entityRepo.partitionField])
      res.json(results);
    });

    router.delete('/:id', authorizer.check(`${entityType}:delete`), async (req, res) => {
      await entityRepo.delete(req.params.id, req.query.etag, req.user, req.query[entityRepo.partitionField])
      res.sendStatus(200);
    });
  }

  return router;
};

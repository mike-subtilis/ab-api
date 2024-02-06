const express = require('express');
const authorizationFactory = require('./authorization-middleware');

module.exports.create = (repo, entityType, options = {}) => {
  const router = express.Router();
  const entityRepo = repo[entityType];
  const authorizer = authorizationFactory.create({ repo });
  router.get('/', authorizer(`${entityType}:list`), (req, res) => {
    const { page = 1, pageSize = 25, ...rest } = req.query;
    entityRepo.getPage(page, pageSize, rest)
      .then((results) => {
        res.json(results);
      });
  });

  router.get('/:id', authorizer(`${entityType}:read`), (req, res) => {
    entityRepo.get(req.params.id, req.query[entityRepo.partitionField])
      .then((results) => {
        res.json(results);
      });
  });

  if (!options.readOnly) {
    router.post('/', authorizer(`${entityType}:create`), (req, res) => {
      entityRepo.create(req.body, req.user, req.query[entityRepo.partitionField])
        .then((results) => {
          res.json(results);
        });
    });

    router.put('/:id', authorizer(`${entityType}:update`), (req, res) => {
      entityRepo.update(req.params.id, req.query.etag, req.body, req.user, req.query[entityRepo.partitionField])
        .then((results) => {
          res.json(results);
        });
    });

    router.delete('/:id', authorizer(`${entityType}:delete`), (req, res) => {
      entityRepo.delete(req.params.id, req.query.etag, req.user, req.query[entityRepo.partitionField])
        .then(() => res.sendStatus(200));
    });
  }

  return router;
};

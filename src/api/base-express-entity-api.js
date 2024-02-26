const express = require('express');

module.exports.create = (constructorOptions) => {
  const {
    repo,
    authorize,
    entityType,
    options = {},
  } = constructorOptions;
  const router = express.Router();
  const entityRepo = repo[entityType];

  router.get('/', authorize(`${entityType}:list`), (req, res) => {
    const { page = 1, pageSize = 25, ...rest } = req.query;
    entityRepo.getPage(page, pageSize, rest, req.user)
      .then((results) => {
        res.json(results);
      });
  });

  router.get('/:id', authorize(`${entityType}:read`), (req, res) => {
    entityRepo.get(req.params.id, req.query[entityRepo.partitionField])
      .then((results) => {
        res.json(results);
      });
  });

  if (!options.readOnly) {
    router.post('/', authorize(`${entityType}:create`), (req, res) => {
      entityRepo.create(req.body, req.user, req.query[entityRepo.partitionField])
        .then((results) => {
          res.json(results);
        });
    });

    router.put('/:id', authorize(`${entityType}:update`), (req, res) => {
      entityRepo.update(req.params.id, req.query.etag, req.body, req.user, req.query[entityRepo.partitionField])
        .then((results) => {
          res.json(results);
        });
    });

    router.delete('/:id', authorize(`${entityType}:delete`), (req, res) => {
      entityRepo.delete(req.params.id, req.query.etag, req.user, req.query[entityRepo.partitionField])
        .then(() => res.sendStatus(200));
    });
  }

  return router;
};

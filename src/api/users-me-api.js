const express = require('express');
const hardcodedAuthorizaton = require('./hardcoded-authorization.json');
const authorizationFactory = require('./authorization-middleware');
const authorizerFactory = require('./authorizer');
const arrayUtil = require('../util/arrayUtil');

module.exports.create = (repo) => {
  const router = express.Router();
  const entityRepo = repo.user;
  const authorize = authorizationFactory.create({ authorizationRules: hardcodedAuthorizaton, entityRepo });

  router.get('/', authorize('user:read:me'), (req, res) => res.json(req.user));

  router.get('/has-permission/:id', (req, res) => {
    const authorizer = authorizerFactory.create({ authorizationRules: hardcodedAuthorizaton, repo });
    const keys = (req.query.keys || '').split(',');
    arrayUtil.asyncFilter(
      keys,
      async k => authorizer.hasGrant(hardcodedAuthorizaton[k], req),
    )
      .then(validKeys => res.json(validKeys));
  });

  router.put('/', authorize('user:update:me'), (req, res) => {
    entityRepo.update(req.user.id, req.query.etag, req.body, req.user, req.query[entityRepo.partitionField])
      .then((results) => {
        res.json(results);
      });
  });

  return router;
};

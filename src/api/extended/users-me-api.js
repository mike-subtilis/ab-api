const express = require('express');
const authorizationRules = require('../authorization-rules-authenticated.json');
const authorizationCheckerFactory = require('../authorizationChecker');
const arrayUtil = require('../../util/arrayUtil');

module.exports.create = ({ repo, authorizer }) => {
  const router = express.Router();
  const entityRepo = repo.user;

  router.get('/', authorizer.check('user:read:me'), (req, res) => res.json(req.user));

  router.get('/has-permission/', (req, res) => {
    const authorizationChecker = authorizationCheckerFactory.create({ authorizationRules, repo });
    const keys = (req.query.keys || '').split(',');
    arrayUtil.asyncFilter(
      keys,
      async k => authorizationChecker.hasGrant(k, req),
    )
      .then(validKeys => res.json(validKeys));
  });

  router.get('/has-permission/:id', (req, res) => {
    const authorizationChecker = authorizationCheckerFactory.create({ authorizationRules, repo });
    const keys = (req.query.keys || '').split(',');
    arrayUtil.asyncFilter(
      keys,
      async k => authorizationChecker.hasGrant(k, req),
    )
      .then(validKeys => res.json(validKeys));
  });

  router.put('/', authorizer('user:update:me'), (req, res) => {
    entityRepo.update(req.user.id, req.query.etag, req.body, req.user, req.query[entityRepo.partitionField])
      .then((results) => {
        res.json(results);
      });
  });

  return router;
};

const express = require('express');
const baseEntityApiFactory = require('./base-express-entity-api');

module.exports.create = (repo) => {
  const router = express.Router();

  router.use('/questions', baseEntityApiFactory.create(repo, 'question', { readOnly: true }));
  router.use('/answers', baseEntityApiFactory.create(repo, 'answer', { readOnly: true }));

  return router;
};

const express = require('express');
const baseEntityApiFactory = require('./base-express-entity-api');

module.exports.create = ({ repo, authorize }) => {
  const router = express.Router();

  // TODO: add restrictions to only "publicity: public" q & a
  router.use(
    '/questions',
    baseEntityApiFactory.create({
      repo,
      authorize,
      entityType: 'question',
      options: { readOnly: true },
    }),
  );

  router.use(
    '/answers',
    baseEntityApiFactory.create({
      repo,
      authorize,
      entityType: 'answer',
      options: { readOnly: true },
    }),
  );

  return router;
};

const express = require('express');
const baseEntityApiFactory = require('../base-express-entity-api');

module.exports.create = ({ repo, authorizer, options, logger }) => {
  const router = express.Router();

  function handleQuestionIdParam(req, res, next) {
    if (req.query.questionId) {
      req.query.questions = req.query.questionId;
      delete req.query.questionId;
      next();
    } else {
      next();
    }
  }

  router.get('/', handleQuestionIdParam);
  router.get('/count', handleQuestionIdParam);

  router.use(
    '/',
    baseEntityApiFactory.create({ repo, authorizer, entityType: 'answer', options: { readOnly: options?.isAnonymous }, logger }),
  );

  return router;
};

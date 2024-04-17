const express = require('express');
const baseEntityApiFactory = require('../base-express-entity-api');
const answerHandlerFactory = require('../../domain/answer-handler');

module.exports.create = ({ repo, authorizer, options, logger }) => {
  const router = express.Router();
  const answerHandler = answerHandlerFactory.create(repo, logger);

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
    baseEntityApiFactory.create({
      repo,
      authorizer,
      entityHandler: answerHandler,
      entityType: 'answer',
      options: { readOnly: options?.isAnonymous },
      logger,
    }),
  );

  return router;
};

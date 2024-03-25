const express = require('express');
const questionApiFactory = require('./extended/question-api');
const answerApiFactory = require('./extended/answer-api');

module.exports.create = ({ repo, authorizer, logger }) => {
  const router = express.Router();

  // TODO: add restrictions to only "publicity: public" q & a
  router.use(
    '/questions',
    questionApiFactory.create({ repo, authorizer, options: { isAnonymous: true }, logger }),
  );

  router.use(
    '/answers',
    answerApiFactory.create({ repo, authorizer, options: { isAnonymous: true }, logger }),
  );

  return router;
};

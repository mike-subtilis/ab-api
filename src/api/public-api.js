const express = require('express');
const questionApiFactory = require('./extended/question-api');
const answerApiFactory = require('./extended/answer-api');

module.exports.create = ({ repo, authorize }) => {
  const router = express.Router();

  // TODO: add restrictions to only "publicity: public" q & a
  router.use(
    '/questions',
    questionApiFactory.create({ repo, authorize, options: { isAnonymous: true }}),
  );

  router.use(
    '/answers',
    answerApiFactory.create({ repo, authorize, options: { isAnonymous: true }}),
  );

  return router;
};

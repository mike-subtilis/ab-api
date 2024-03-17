const express = require('express');
const baseEntityApiFactory = require('../base-express-entity-api');

module.exports.create = ({ repo, authorize }) => { 
  const router = express.Router();

  const questionRepo = repo.question;

  function handleQuestionIdParam(req, res, next) {
    if (req.query.questionId) {
      questionRepo.get(req.query.questionId)
        .then((q) => {
          delete req.query.questionId;
          // if a question is specified and there are no answers, then
          // we insert a bogus answer id so that an empty array is not
          // treated the same as not passing a parameter
          req.query.id = q && q.answerIds ? q.answerIds : ['-no-answers-'];
          next();
        });
    } else {
      next();
    }
  }

  router.get('/', handleQuestionIdParam);
  router.get('/count', handleQuestionIdParam);

  router.use('/', baseEntityApiFactory.create({ repo, authorize, entityType: 'answer' }));

  return router;
};

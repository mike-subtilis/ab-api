const express = require('express');
const arrayUtil = require('../util/arrayUtil');

module.exports.create = ({ repo, authorize }) => {
  const router = express.Router();

  const questionRepo = repo.question;

  router.put(
    '/questions/:id/updateAnswers',
    authorize('question:update:updateanswers'),
    (req, res) => {
      questionRepo.get(req.params.id)
        .then((q) => {
          const existingPlusAdded = arrayUtil.uniq([...(q.answerIds || []), ...(req.body.addedAnswerIds || [])]);
          const answerIds = arrayUtil.difference(existingPlusAdded, req.body.removedAnswerIds || []);
          return questionRepo.update(
            req.params.id,
            req.query.etag,
            { answerIds },
            req.user,
            req.query[questionRepo.partitionField],
          );
        })
        .then((updatedQuestion) => { res.json(updatedQuestion); });
    },
  );

  router.get('/answers', (req, res, next) => {
    if (req.query.questionId) {
      questionRepo.get(req.query.questionId)
        .then((q) => {
          delete req.query.questionId;
          // if a question is specified and there are no answers, then 
          // we insert a bogus answer id so that an empty array is not
          // treated the same as not passing a parameter
          req.query.id = q.answerIds || ['-no-answers-'];
          next();
        });
    } else {
      next();
    }
  });

  router.get('/answers/count', (req, res, next) => {
    if (req.query.questionId) {
      questionRepo.get(req.query.questionId)
        .then((q) => {
          delete req.query.questionId;
          // if a question is specified and there are no answers, then 
          // we insert a bogus answer id so that an empty array is not
          // treated the same as not passing a parameter
          req.query.id = q.answerIds || ['-no-answers-'];
          next();
        });
    } else {
      next();
    }
  });

  return router;
};

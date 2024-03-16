const express = require('express');
const arrayUtil = require('../util/arrayUtil');
const ballotProcessorFactory = require('../domain/ballot-processor');

module.exports.create = ({ repo, authorize }) => {
  const router = express.Router();

  const questionRepo = repo.question;
  const ballotProcessor = ballotProcessorFactory.create(repo);

  router.get('/questions/:id/results',
    authorize('question:read:vote'), // TODO: how should we permission this?
    (req, res) => {
      res.json([]);
    });

  router.put(
    '/questions/:id/update-answers',
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

  router.post(
    '/questions/:id/request-ballot',
    authorize('question:read:vote'), // TODO: how should we permission this?
    async (req, res) => {
      const hydratedBallot = await ballotProcessor.createBallot(req.params.id, req.user);
      res.json(hydratedBallot);
    },
  );

  router.post(
    '/questions/:id/return-ballot',
    authorize('question:read:vote'), // TODO: how should we permission this?
    async (req, res) => {
      const validatedBallot = await ballotProcessor.validateBallot(
        req.body.id,
        req.params.id,
        req.user.id,
        req.body.vote,
      );

      ballotProcessor.processValidatedBallot(validatedBallot);

      res.json({ statusCode: 202, status: 'Accepted' });
      // res.sendStatus(202); // Accepted
    },
  );

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

  router.get('/answers', handleQuestionIdParam);
  router.get('/answers/count', handleQuestionIdParam);

  return router;
};

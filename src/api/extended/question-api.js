const express = require('express');
const baseEntityApiFactory = require('../base-express-entity-api');
const arrayUtil = require('../../util/arrayUtil');
const ballotProcessorFactory = require('../../domain/ballot-processor');

module.exports.create = ({ repo, authorize }) => {
  const router = express.Router();

  const questionRepo = repo.question;
  const ballotProcessor = ballotProcessorFactory.create(repo);

  router.get('/:id/results',
    authorize('question:read:vote'), // TODO: how should we permission this?
    async (req, res) => {
      const qaStats = await repo.questionAnswerStatistic.getPage(1,
        10,
        { questionId: req.params.id, sort: '-wins' });
      const answerIds = qaStats.map(s => s.answerId);
      const answers = await repo.answer.getPage(1, 10, { id: answerIds });
      const nameValues = qaStats.map((qaStats) => {
        const answer = answers.find(a => a.id === qaStats.answerId);
        return {
          name: answer ? answer.text : 'Unknown',
          value: qaStats.wins,
        };
      });
      res.json(nameValues);
    });

  router.put(
    '/:id/update-answers',
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
    '/:id/request-ballot',
    authorize('question:read:vote'), // TODO: how should we permission this?
    async (req, res) => {
      const hydratedBallot = await ballotProcessor.createBallot(req.params.id, req.user);
      res.json(hydratedBallot);
    },
  );

  router.post(
    '/:id/return-ballot',
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

  router.use('/', baseEntityApiFactory.create({ repo, authorize, entityType: 'question' }));

  return router;
};

const express = require('express');
const baseEntityApiFactory = require('../base-express-entity-api');
const ballotProcessorFactory = require('../../domain/ballot-processor');
const questionHandlerFactory = require('../../domain/question-handler');

module.exports.create = ({ repo, authorizer, options, logger }) => {
  const router = express.Router();

  const questionRepo = repo.question;
  const ballotProcessor = ballotProcessorFactory.create(repo, logger);
  const questionHandler = questionHandlerFactory.create(repo, logger);

  router.get(
    '/:id/results',
    authorizer.check('question:read'),
    async (req, res) => {
      const resultsCount = req.query.count ? Number(req.query.count) : 10;
      const qStats = await repo.questionStatistic.get(req.params.id);
      const qaStats = await repo.questionAnswerStatistic.getPage(
        1,
        resultsCount,
        { questionId: req.params.id, sort: '-wins' },
      );
      const answerIds = qaStats.map(s => s.answerId);
      const answers = await repo.answer.getPage(1, resultsCount, { id: answerIds });
      const nameValues = qaStats.map((qaStat) => {
        const answer = answers.find(a => a.id === qaStat.answerId);
        return {
          text: answer ? answer.text : 'Unknown',
          wins: qaStat.wins,
          losses: qaStat.losses,
        };
      });

      res.json({
        votes: qStats ? qStats.votes : 0,
        answerWins: nameValues,
      });
    },
  );

  router.get(
    '/:id/my-results',
    authorizer.check('question:read:my-results'),
    async (req, res) => {
      const resultsCount = req.query.count ? Number(req.query.count) : 10;
      const qauStats = await repo.questionAnswerUserStatistic.getPage(
        1,
        resultsCount,
        { questionId: req.params.id, userId: req.user.id, sort: '-wins' },
      );
      const answerIds = qauStats.map(s => s.answerId);
      const answers = await repo.answer.getPage(1, resultsCount, { id: answerIds });
      const nameValues = qauStats.map((qauStat) => {
        const answer = answers.find(a => a.id === qauStat.answerId);
        return {
          text: answer ? answer.text : 'Unknown',
          wins: qauStat.wins,
          losses: qauStat.losses,
        };
      });

      res.json({ answerWins: nameValues });
    },
  );

  router.put(
    '/:id/update-answers',
    authorizer.check('question:update:update-answers'),
    (req, res) => {
      questionRepo.update(
        req.params.id,
        req.query.etag,
        { answers: { add: req.body.addedAnswerIds, remove: req.body.removedAnswerIds } },
        req.user,
      )
        .then((updatedQuestion) => { res.json(updatedQuestion); });
    },
  );

  router.post(
    '/:id/request-ballot',
    authorizer.check('question:read:vote'),
    async (req, res) => {
      const hydratedBallot = await ballotProcessor.createBallot(req.params.id, req.user);
      res.json(hydratedBallot);
    },
  );

  router.post(
    '/:id/return-ballot',
    authorizer.check('question:read:vote'),
    async (req, res) => {
      const validatedBallot = await ballotProcessor.validateBallot(
        req.body.id,
        req.params.id,
        req.user?.id || '',
        req.body.vote,
      );

      ballotProcessor.processValidatedBallot(validatedBallot);

      res.json({ statusCode: 202, status: 'Accepted' });
    },
  );

  router.use(
    '/',
    baseEntityApiFactory.create({
      repo,
      authorizer,
      entityHandler: questionHandler,
      entityType: 'question',
      options: { readOnly: options?.isAnonymous },
      logger,
    }),

  );

  return router;
};

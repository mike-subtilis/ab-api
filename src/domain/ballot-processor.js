const crypto = require('crypto');
const { pick } = require('../util/objectUtil');
const answerUtil = require('./answer-util');

module.exports.create = (repo, logger) => {
  const questionRepo = repo.question;
  const answerRepo = repo.answer;
  const ballotKVStore = repo.ballot;
  const questionAnswerStatisticRepo = repo.questionAnswerStatistic;
  const questionAnswerUserStatisticRepo = repo.questionAnswerUserStatistic;
  const questionStatisticRepo = repo.questionStatistic;

  async function createBallot(questionId, user) {
    const q = await questionRepo.get(questionId);
    const selectedAnswerIds = answerUtil.selectAnswersForBallot(q.answerIds);
    logger.trace(`creating ballot for Q: ${questionId}. A: ${selectedAnswerIds.join(', ')}...`);
    const answer0 = await answerRepo.get(selectedAnswerIds[0]);
    const answer1 = await answerRepo.get(selectedAnswerIds[1]);

    const persistedBallot = {
      id: crypto.randomUUID(),
      questionId: q.id,
      userId: user?.id || '',
      answerIds: [answer0.id, answer1.id],
      createdAt: (new Date()).toISOString(),
    };
    const savedBallot = await ballotKVStore.set(persistedBallot.id, persistedBallot);
    const hydratedBallot = {
      id: savedBallot.id,
      answers: [answer0, answer1].map(a => pick(a, ['text'])),
    };

    return hydratedBallot;
  }

  async function validateBallot(ballotId, questionId, userId, voteIndex) {
    const existingBallot = await ballotKVStore.pop(ballotId);

    if (!existingBallot) {
      throw new Error('This ballot does not exist');
    }
    if (existingBallot.questionId !== questionId) {
      throw new Error('This ballot is for a different question');
    }
    if (existingBallot.userId !== userId) {
      throw new Error('This ballot is for a different user');
    }
    if (voteIndex !== 0 && voteIndex !== 1) {
      throw new Error('Vote must be for one of the two options');
    }

    const winningAnswerId = existingBallot.answerIds[voteIndex];
    const losingAnswerIndex = voteIndex === 0 ? 1 : 0;
    const losingAnswerId = existingBallot.answerIds[losingAnswerIndex];

    const validatedBallot = { ballotId, questionId, winningAnswerId, losingAnswerId, userId };
    return validatedBallot;
  }

  async function processValidatedBallot(ballot) {
    // { id, questionId, answerId, wins, losses }
    questionAnswerStatisticRepo.incrementWins(ballot.questionId, ballot.winningAnswerId);
    questionAnswerStatisticRepo.incrementLosses(ballot.questionId, ballot.losingAnswerId);

    questionAnswerUserStatisticRepo.incrementWins(ballot.questionId, ballot.winningAnswerId, ballot.userId);
    questionAnswerUserStatisticRepo.incrementLosses(ballot.questionId, ballot.losingAnswerId, ballot.userId);

    questionStatisticRepo.incrementVotes(ballot.questionId);
  }

  return { createBallot, validateBallot, processValidatedBallot };
};

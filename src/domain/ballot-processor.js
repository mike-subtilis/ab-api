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
    const answerCount = await answerRepo.getCount({ questions: questionId });
    const selectedAnswerIndexes = answerUtil.selectAnswerIndexesForBallot(answerCount);
    logger.trace(`creating ballot for Q: ${questionId}. A: ${selectedAnswerIndexes.join(', ')}...`);
    const answers0 = await answerRepo.getPage(selectedAnswerIndexes[0] + 1, 1, { questions: questionId });
    const answers1 = await answerRepo.getPage(selectedAnswerIndexes[1] + 1, 1, { questions: questionId });

    const answer0 = answers0[0];
    const answer1 = answers1[0];

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 3600000);
    const persistedBallot = {
      id: crypto.randomUUID(),
      questionId: questionId,
      userId: user?.id || '',
      answerIds: [answer0.id, answer1.id],
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    const savedBallot = await ballotKVStore.set(persistedBallot.id, persistedBallot);
    const hydratedBallot = {
      id: savedBallot.id,
      answers: [answer0, answer1].map(a => pick(a, ['text', 'tags'])),
      expiresAt: savedBallot.expiresAt,
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

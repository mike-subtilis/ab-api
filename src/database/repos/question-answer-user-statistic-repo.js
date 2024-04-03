const baseCosmosContainerRepo = require('../cosmos/base-cosmos-container-repo');
const questionAnswerUserStatisticSchema = require('../schemas/questionAnswerUserStatistic.json');

module.exports.create = (cosmosDb, logger) => {
  const containerName = 'QuestionAnswerUserStatistics';
  const baseRepo = baseCosmosContainerRepo.create(
    cosmosDb,
    {
      containerName,
      partitionField: 'questionId',
      schema: questionAnswerUserStatisticSchema,
    },
    logger,
  );
  const container = cosmosDb.container(containerName);

  async function incrementWinsOrLosses(questionId, answerId, userId, winsOrLosses) {
    const id = `${questionId}|${answerId}|${userId}`;
    const safePartitionValue = questionId;
    const updatedAt = new Date().toISOString();

    const incrementWinsOrLossesOps = [
      {
        op: 'replace',
        path: '/updatedAt',
        value: updatedAt,
      },
      {
        op: 'incr',
        path: `/${winsOrLosses}`,
        value: 1,
      },
    ];

    let updatedQAStat = null;
    try {
      const { resource } = await container
        .item(id, safePartitionValue)
        .patch(incrementWinsOrLossesOps);
      updatedQAStat = resource;
    } catch (e) {
      if (e.code !== 404) {
        throw e;
      }
    }

    if (updatedQAStat) {
      return updatedQAStat;
    }

    const newQAUStat = {
      id,
      updatedAt,
      questionId,
      answerId,
      userId,
      wins: winsOrLosses === 'wins' ? 1 : 0,
      losses: winsOrLosses === 'losses' ? 1 : 0,
    };
    const { resource: createdQAUStat } = await container
      .items
      .upsert(newQAUStat);

    return createdQAUStat;
  }

  async function incrementWins(qId, aId, uId) {
    return incrementWinsOrLosses(qId, aId, uId, 'wins');
  }
  async function incrementLosses(qId, aId, uId) {
    return incrementWinsOrLosses(qId, aId, uId, 'losses');
  }

  return { ...baseRepo, incrementWins, incrementLosses };
};

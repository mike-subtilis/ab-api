const baseCosmosContainerRepo = require('../cosmos/base-cosmos-container-repo');
const questionAnswerStatisticSchema = require('../schemas/questionAnswerStatistic.json');

module.exports.create = async (cosmosDb, logger) => {
  const containerName = 'QuestionAnswerStatistics';
  const baseRepo = await baseCosmosContainerRepo.create(
    cosmosDb,
    {
      containerName,
      partitionField: 'questionId',
      schema: questionAnswerStatisticSchema,
    },
    logger,
  );
  const container = cosmosDb.container(containerName);

  async function incrementWinsOrLosses(questionId, answerId, winsOrLosses) {
    const id = `${questionId}|${answerId}`;
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

    const newQAStat = {
      id,
      updatedAt,
      questionId,
      answerId,
      wins: winsOrLosses === 'wins' ? 1 : 0,
      losses: winsOrLosses === 'losses' ? 1 : 0,
    };
    const { resource: createdQAStat } = await container
      .items
      .upsert(newQAStat);

    return createdQAStat;
  }

  async function incrementWins(qId, aId) {
    return incrementWinsOrLosses(qId, aId, 'wins');
  }
  async function incrementLosses(qId, aId) {
    return incrementWinsOrLosses(qId, aId, 'losses');
  }

  return { ...baseRepo, incrementWins, incrementLosses };
};

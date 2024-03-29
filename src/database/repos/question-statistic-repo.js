const baseCosmosContainerRepo = require('../base-cosmos-container-repo');
const questionStatisticSchema = require('../schemas/questionStatistic.json');

module.exports.create = (cosmosDb, logger) => {
  const container = cosmosDb.container('QuestionStatistics');
  const baseRepo = baseCosmosContainerRepo.create(
    container,
    {
      partitionField: 'questionId',
      schema: questionStatisticSchema,
    },
    logger,
  );

  async function incrementVotes(questionId) {
    const id = questionId;
    const safePartitionValue = questionId;
    const updatedAt = new Date().toISOString();

    const incrementVotesOps = [
      {
        op: 'replace',
        path: '/updatedAt',
        value: updatedAt,
      },
      {
        op: 'incr',
        path: '/votes',
        value: 1,
      },
    ];

    let updatedQStat = null;
    try {
      const { resource } = await container
        .item(id, safePartitionValue)
        .patch(incrementVotesOps);
      updatedQStat = resource;
    } catch (e) {
      if (e.code !== 404) {
        throw e;
      }
    }

    if (updatedQStat) {
      return updatedQStat;
    }

    const newQStat = {
      id,
      updatedAt,
      questionId,
      votes: 1,
    };
    const { resource: createdQStat } = await container
      .items
      .upsert(newQStat);

    return createdQStat;
  }

  return { ...baseRepo, incrementVotes };
};

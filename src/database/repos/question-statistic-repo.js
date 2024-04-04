const baseCosmosContainerRepo = require('../cosmos/base-cosmos-container-repo');
const questionStatisticSchema = require('../schemas/questionStatistic.json');

module.exports.create = async (cosmosDb, logger) => {
  const containerName = 'QuestionStatistics';
  const baseRepo = await baseCosmosContainerRepo.create(
    cosmosDb,
    {
      containerName,
      partitionField: 'questionId',
      schema: questionStatisticSchema,
    },
    logger,
  );
  const container = cosmosDb.container(containerName);

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

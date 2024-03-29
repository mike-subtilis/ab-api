const cosmos = require('@azure/cosmos');
const { createClient: createRedisClient } = require('redis');
const baseCosmosContainerRepo = require('./base-cosmos-container-repo');
const baseRedisKVStore = require('./base-redis-kv-store');
const baseInMemoryKVStore = require('./base-in-memory-kv-store');
const migrations = require('./migrations/index');
const questionAnswerStatisticRepo = require('./repos/question-answer-statistic-repo');
const questionAnswerUserStatisticRepo = require('./repos/question-answer-user-statistic-repo');
const questionStatisticRepo = require('./repos/question-statistic-repo');
const schema = require('./schemas/index');

module.exports.create = async (dbConfig, logger) => {
  const cosmosClient = new cosmos.CosmosClient(dbConfig.cosmos);
  const cosmosDb = cosmosClient.database(dbConfig.cosmos.dbId);

  let redisClient;
  if (dbConfig.redis && dbConfig.redis.url) {
    redisClient = createRedisClient({ url: dbConfig.redis.url });
    redisClient.on('error', (e) => { logger.error(e); });
    await redisClient.connect();
  }

  await cosmosDb
    .containers
    .createIfNotExists({ id: 'Questions', partitionKey: { kind: 'Hash', paths: ['/questionId'] } });
  await cosmosDb
    .containers
    .createIfNotExists({ id: 'Answers', partitionKey: { kind: 'Hash', paths: ['/answerId'] } });
  await cosmosDb
    .containers
    .createIfNotExists({ id: 'Tags', partitionKey: { kind: 'Hash', paths: ['/key'] } });
  await cosmosDb
    .containers
    .createIfNotExists({ id: 'Users', partitionKey: { kind: 'Hash', paths: ['/userId'] } });
  await cosmosDb
    .containers
    .createIfNotExists({ id: 'QuestionAnswerStatistics', partitionKey: { kind: 'Hash', paths: ['/questionId'] } });
  await cosmosDb
    .containers
    .createIfNotExists({ id: 'QuestionAnswerUserStatistics', partitionKey: { kind: 'Hash', paths: ['/questionId'] } });
  await cosmosDb
    .containers
    .createIfNotExists({ id: 'QuestionStatistics', partitionKey: { kind: 'Hash', paths: ['/questionId'] } });

  return {
    question: baseCosmosContainerRepo.create(
      cosmosDb.container('Questions'),
      {
        partitionField: 'questionId',
        schema: schema.question,
        migrations: migrations.question.create(),
      },
      logger,
    ),
    answer: baseCosmosContainerRepo.create(
      cosmosDb.container('Answers'),
      {
        partitionField: 'answerId',
        schema: schema.answer,
      },
      logger,
    ),
    tag: baseCosmosContainerRepo.create(
      cosmosDb.container('Tags'),
      {
        partitionField: 'key',
        schema: schema.tag,
      },
      logger,
    ),
    user: baseCosmosContainerRepo.create(
      cosmosDb.container('Users'),
      {
        partitionField: 'userId',
        schema: schema.user,
      },
      logger,
    ),
    questionAnswerStatistic: questionAnswerStatisticRepo.create(cosmosDb, logger),
    questionAnswerUserStatistic: questionAnswerUserStatisticRepo.create(cosmosDb, logger),
    questionStatistic: questionStatisticRepo.create(cosmosDb, logger),
    ballot: redisClient
      ? baseRedisKVStore.create(redisClient, 'ballot')
      : baseInMemoryKVStore.create(),
  };
};

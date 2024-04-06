const cosmosClientFactory = require('./cosmos/cosmos-client');
const baseCosmosContainerRepo = require('./cosmos/base-cosmos-container-repo');
const redisClientFactory = require('./redis/redis-client');
const baseRedisKVStore = require('./redis/base-redis-kv-store');
const baseInMemoryKVStore = require('./in-memory/base-in-memory-kv-store');
const basePrismaRepo = require('./prisma/base-prisma-repo');
const prismaClientFactory = require('./prisma/prisma-client');
const questionAnswerStatisticRepo = require('./repos/question-answer-statistic-repo');
const questionAnswerUserStatisticRepo = require('./repos/question-answer-user-statistic-repo');
const questionStatisticRepo = require('./repos/question-statistic-repo');
const schema = require('./schemas/index');

module.exports.create = async (dbConfig, logger) => {
  const cosmosDb = await cosmosClientFactory.create(dbConfig.cosmos, logger);
  const redisClient = await redisClientFactory.create(dbConfig.redis, logger);
  const prismaClient = await prismaClientFactory.create(dbConfig.prisma, logger);

  const questionRepo = await basePrismaRepo.create(
    prismaClient,
    { entityType: 'Question', schema: schema.question },
    logger,
  );
  const answerRepo = await baseCosmosContainerRepo.create(
    cosmosDb,
    {
      containerName: 'Answers',
      partitionField: 'answerId',
      schema: schema.answer,
    },
    logger,
  );
  const tagRepo = await basePrismaRepo.create(
    prismaClient,
    {
      entityType: 'Tag',
      schema: schema.tag,
    },
    logger,
  );
  const userRepo = await basePrismaRepo.create(
    prismaClient,
    { entityType: 'User', schema: schema.user },
    logger,
  );

  return {
    question: questionRepo,
    answer: answerRepo,
    tag: tagRepo,
    user: userRepo,
    questionAnswerStatistic: await questionAnswerStatisticRepo.create(cosmosDb, logger),
    questionAnswerUserStatistic: await questionAnswerUserStatisticRepo.create(cosmosDb, logger),
    questionStatistic: await questionStatisticRepo.create(cosmosDb, logger),
    ballot: await redisClient
      ? baseRedisKVStore.create(redisClient, { entityType: 'ballot', expiry: 3600 })
      : baseInMemoryKVStore.create(),
  };
};

const cosmosClientFactory = require('./cosmos/cosmos-client');
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
    {
      entityType: 'Question',
      schema: schema.question,
      defaultInclude: { tags: true },
      fieldSetters: {
        answers: (v) => {
          const setter = {};
          if (v && v.add) {
            setter.connect = v.add.map(vi => ({ id: vi }));
          }
          if (v && v.remove) {
            setter.disconnect = v.remove.map(vi => ({ id: vi }));
          }
          return setter;
        },
      },
    },
    logger,
  );
  const answerRepo = await basePrismaRepo.create(
    prismaClient,
    {
      entityType: 'Answer',
      schema: schema.answer,
      defaultInclude: { tags: true },
      fieldFilters: {
        questions: (v) => {
          if (Array.isArray(v)) {
            return { hasSome: v.map(vi => ({ id: vi })) };
          }
          return { some: { id: v } };
        },
      },
      fieldSetters: {
        questions: (v) => {
          const setter = {};
          if (v && v.add) {
            setter.connect = v.add.map(vi => ({ id: vi }));
          }
          if (v && v.remove) {
            setter.disconnect = v.remove.map(vi => ({ id: vi }));
          }
          return setter;
        },
      },
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

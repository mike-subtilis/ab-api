const cosmos = require('@azure/cosmos');
const baseCosmosContainerRepo = require('./base-cosmos-container-repo');
const baseKVRepo = require('./base-kv-in-memory-repo');
const migrations = require('./migrations/index');
const questionAnswerStatisticsRepo = require('./repos/question-answer-statistics-repo');
const schema = require('./schemas/index');

module.exports.create = async (dbConfig) => {
  const cosmosClient = new cosmos.CosmosClient(dbConfig.cosmos);
  const cosmosDb = cosmosClient.database(dbConfig.cosmos.dbId);

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

  return {
    question: baseCosmosContainerRepo.create(
      cosmosDb.container('Questions'),
      {
        partitionField: 'questionId',
        schema: schema.question,
        migrations: migrations.question.create(),
      },
    ),
    answer: baseCosmosContainerRepo.create(
      cosmosDb.container('Answers'),
      {
        partitionField: 'answerId',
        schema: schema.answer,
      },
    ),
    tag: baseCosmosContainerRepo.create(
      cosmosDb.container('Tags'),
      {
        partitionField: 'key',
        schema: schema.tag,
      },
    ),
    user: baseCosmosContainerRepo.create(
      cosmosDb.container('Users'),
      {
        partitionField: 'userId',
        schema: schema.user,
      },
    ),
    questionAnswerStatistics: questionAnswerStatisticsRepo.create(cosmosDb),
    ballot: baseKVRepo.create(),
  };
};

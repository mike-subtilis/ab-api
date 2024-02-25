const cosmos = require('@azure/cosmos');
const baseCosmosContainerRepo = require('./base-cosmos-container-repo');
const questionMigrations = require('./migrations/question');

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

  return {
    question: baseCosmosContainerRepo.create(
      cosmosDb.container('Questions'),
      {
        partitionField: 'questionId',
        migrations: questionMigrations.create(),
      },
    ),
    answer: baseCosmosContainerRepo.create(
      cosmosDb.container('Answers'),
      { partitionField: 'answerId' },
    ),
    tag: baseCosmosContainerRepo.create(
      cosmosDb.container('Tags'),
      { partitionField: 'key' },
    ),
    user: baseCosmosContainerRepo.create(
      cosmosDb.container('Users'),
      { partitionField: 'userId' },
    ),
  };
};

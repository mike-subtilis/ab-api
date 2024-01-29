const cosmos = require('@azure/cosmos');
const baseCosmosContainerRepo = require('./base-cosmos-container-repo');

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
    .createIfNotExists({ id: 'Users', partitionKey: { kind: 'Hash', paths: ['/userId'] } });

  return {
    question: baseCosmosContainerRepo.create(cosmosDb.container('Questions'), 'questionId', q => q.id),
    answer: baseCosmosContainerRepo.create(cosmosDb.container('Answers'), 'answerId', a => a.id),
    user: baseCosmosContainerRepo.create(cosmosDb.container('Users'), 'userId', u => u.id),
  };
};

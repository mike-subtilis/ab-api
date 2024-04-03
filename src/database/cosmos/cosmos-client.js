const cosmos = require('@azure/cosmos');

module.exports.create = async (cosmosConfig) => {
  const cosmosClient = new cosmos.CosmosClient(cosmosConfig);
  const cosmosDb = cosmosClient.database(cosmosConfig.dbId);
  return cosmosDb;
};

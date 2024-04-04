const cosmos = require('@azure/cosmos');

module.exports.create = async (cosmosConfig, logger) => {
  logger.trace('Connecting to cosmos...');
  const cosmosClient = new cosmos.CosmosClient(cosmosConfig);
  const cosmosDb = cosmosClient.database(cosmosConfig.dbId);
  return cosmosDb;
};

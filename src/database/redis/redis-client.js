const { createClient: createRedisClient } = require('redis');

module.exports.create = async (redisConfig, logger) => {
  let redisClient;
  if (redisConfig && redisConfig.url) {
    redisClient = createRedisClient({ url: redisConfig.url });
    redisClient.on('error', (e) => { logger.error(e); });
    await redisClient.connect();
  }
  return redisClient;
};

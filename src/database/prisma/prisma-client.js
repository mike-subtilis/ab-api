const { PrismaClient } = require('@prisma/client');

module.exports.create = async (prismaConfig, logger) => {
  logger.info('Connecting to Prisma...');
  const prisma = new PrismaClient({
    datasources: {
      db: { url: prismaConfig.url },
    },
    log: ['query', 'info', 'warn', 'error'],
  });

  return prisma;
};

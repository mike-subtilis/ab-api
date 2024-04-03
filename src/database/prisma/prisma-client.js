const { PrismaClient } = require('@prisma/client');

module.exports.create = (prismaConfig) => {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: prismaConfig.url },
    },
    log: ['query', 'info', 'warn', 'error'],
  });

  return prisma;
};

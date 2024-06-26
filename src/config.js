require('dotenv').config();

module.exports = {
  authentication: {
    auth0: {
      domain: process.env.AUTH0_DOMAIN,
      audience: process.env.AUTH0_AUDIENCE,
      apiClientId: process.env.AUTH0_API_CLIENT_ID,
      apiClientSecret: process.env.AUTH0_API_CLIENT_SECRET,
      apiAudience: process.env.AUTH0_API_AUDIENCE,
    },
    appOrigin: process.env.APP_ORIGIN,
  },
  database: {
    cosmos: {
      endpoint: process.env.COSMOS_ENDPOINT,
      key: process.env.COSMOS_KEY,
      userAgentSuffix: process.env.COSMOS_USER_AGENT_SUFFIX,
      dbId: process.env.COSMOS_DB_ID,
    },
    redis: {
      url: process.env.REDIS_URL,
    },
    prisma: {
      url: process.env.POSTGRESQL_URL,
    },
  },
};

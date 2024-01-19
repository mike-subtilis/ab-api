require('dotenv').config();

module.exports = {
  authentication: {
    auth0: {
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENTID,
      audience: process.env.AUTH0_AUDIENCE,
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
  },
};

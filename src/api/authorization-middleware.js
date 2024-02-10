const authorizerFactory = require('./authorizer');

module.exports.create = ({ authorizationRules, entityRepo }) => {
  if (!authorizationRules) {
    throw new Error('Authorization Rules are required to set up the authorization-middleware');
  }
  if (!entityRepo) {
    throw new Error('Entity Repo is required to set up the authorization-middleware');
  }

  const authorizer = authorizerFactory.create({ authorizationRules, entityRepo });

  return grantKey => (async (req, res, next) => {
    console.log(`checking permission for ${grantKey}...`);

    try {
      const isAuthorized = await authorizer.hasGrant(grantKey, req);
      if (isAuthorized) {
        next();
      } else {
        next(new Error(`You do not have '${grantKey}' access to this endpoint`));
      }
    } catch (ex) {
      next(ex);
    }
  });
};

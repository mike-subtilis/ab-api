const authorizationCheckerFactory = require('./authorizationChecker');
const authorizationFilterGeneratorFactory = require('./authorizationFilterer');

module.exports.create = ({ authorizationRules, repo, logger }) => {
  if (!authorizationRules) {
    throw new Error('Authorization Rules are required to set up the authorization-middleware');
  }
  if (!repo) {
    throw new Error('Repo is required to set up the authorization-middleware');
  }

  const authorizationChecker = authorizationCheckerFactory.create({ authorizationRules, repo });
  const authorizationFilterer = authorizationFilterGeneratorFactory.create({ authorizationRules });

  return {
    check: grantKey => (async (req, res, next) => {
      logger.trace(`checking permission for ${grantKey}...`);

      try {
        const isAuthorized = await authorizationChecker.hasGrant(grantKey, req);
        if (isAuthorized) {
          next();
        } else {
          next(new Error(`You do not have '${grantKey}' access to this endpoint`));
        }
      } catch (ex) {
        next(ex);
      }
    }),
    filter: grantKey => (async (req, res, next) => {
      logger.trace(`adding filters for ${grantKey}...`);

      try {
        const filters = authorizationFilterer.getListFilters(grantKey, req.user);
        req.authorizationFilters = filters;
        next();
      } catch (ex) {
        next(ex);
      }
    }),
  };
};

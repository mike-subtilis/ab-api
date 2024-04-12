const crypto = require('crypto');
const { auth } = require('express-oauth2-jwt-bearer');
const { jwtDecode } = require('jwt-decode');

module.exports.create = (auth0Config, userRepo, logger) => {
  if (!auth0Config.domain || !auth0Config.audience) {
    logger.error('Please make sure that AUTH0_DOMAIN AND AUTH0_AUDIENCE are set with valid domain and audience values. Running in non-authenticated mode...');
    return {};
  }

  const checkJwt = auth({
    audience: auth0Config.audience,
    issuerBaseURL: `https://${auth0Config.domain}/`,
    algorithms: ['RS256'],
  });

  async function getAccessToken() {
    const requiredConfig = ['domain', 'apiClientId', 'apiClientSecret', 'apiAudience'];
    const missingConfig = requiredConfig.filter(c => !auth0Config[c]);
    if (missingConfig.length > 0) {
      logger.error(`Cannot retrieve user from Auth0: missing ${missingConfig.join(', ')}.`);
      return null;
    }

    const response = await fetch(
      `https://${auth0Config.domain}/oauth/token`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: auth0Config.apiClientId,
          client_secret: auth0Config.apiClientSecret,
          audience: auth0Config.apiAudience,
          grant_type: 'client_credentials',
        }),
      },
    );
    const responseData = await response.json();

    return responseData.access_token;
  }

  async function getUserFromAuth0(auth0UserId, accessToken) {
    const response = await fetch(
      `https://${auth0Config.domain}/api/v2/users/${auth0UserId}`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    const responseData = await response.json();

    return responseData;
  }

  async function fetchUserFromAuth0AndStoreInRepo(auth0UserId) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      const userFromAuth0 = await getUserFromAuth0(auth0UserId, accessToken);
      if (userFromAuth0) {
        const userFields = {
          id: crypto.randomUUID(),
          auth0UserId,
          name: userFromAuth0.nickname || userFromAuth0.name || '(unknown)',
          email: userFromAuth0.email,
        };
        if (!userRepo) {
          logger.error('No user repo is configured. Cannot save this user.');
          return userFields;
        }
        const createdUser = await userRepo.create(userFields, userFields);
        return createdUser;
      }
    }
    logger.trace('Returning default user...');
    return { name: '(unknown)' };
  }

  async function getUserFromRepo(auth0UserId) {
    if (!userRepo) {
      logger.error('No user repo is configured. Cannot save this user.');
      return null;
    }

    const userFromRepo = await userRepo.getUnique('auth0UserId', auth0UserId);
    if (userFromRepo) {
      logger.debug(`Found user ${userFromRepo.name} in the user repo.`);
      return userFromRepo;
    }
    logger.warn(`Could not find user ${auth0UserId} in the user repo.`);
    return null;
  }

  const loadUser = (req, res, next) => {
    const decoded = jwtDecode(req.auth.token);
    const auth0UserId = decoded.sub;

    getUserFromRepo(auth0UserId)
      .then((user) => {
        if (user) {
          return user;
        }
        return fetchUserFromAuth0AndStoreInRepo(auth0UserId);
      })
      .then((user) => { req.user = user; })
      .then(() => next())
      .catch(ex => next(ex));
  };

  return { authenticate: checkJwt, loadUser };
};

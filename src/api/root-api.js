const express = require('express');
const { auth } = require('express-oauth2-jwt-bearer');
const baseEntityApiFactory = require('./base-express-entity-api');

module.exports.create = (authenticationConfig, repo) => {
  const router = express.Router();

  if (authenticationConfig.auth0.domain && authenticationConfig.auth0.audience) {
    const checkJwt = auth({
      audience: authenticationConfig.auth0.audience,
      issuerBaseURL: `https://${authenticationConfig.auth0.domain}/`,
      algorithms: ['RS256'],
    });
    router.use(checkJwt);

    router.get('/check-authentication', checkJwt, (req, res) => {
      res.send('Your access token was successfully validated!');
    });
  } else {
    console.log('Please make sure that AUTH0_DOMAIN AND AUTH0_AUDIENCE are set with valid domain and audience values. Running in non-authenticated mode...');
  }

  router.use('/questions', baseEntityApiFactory.create(repo, 'question'));
  router.use('/users', baseEntityApiFactory.create(repo, 'user'));

  return router;
};

const express = require('express');
const auth0MiddlewareFactory = require('./auth0-middleware');
const baseEntityApiFactory = require('./base-express-entity-api');
const publicApiFactory = require('./public-api');
const answerApiFactory = require('./extended/answer-api');
const questionApiFactory = require('./extended/question-api');
const usersMeApiFactory = require('./extended/users-me-api');
const anonymousAuthorizatonRules = require('./authorization-rules-anonymous.json');
const authenticatedAuthorizatonRules = require('./authorization-rules-authenticated.json');
const authorizationFactory = require('./authorization-middleware');
const { omit } = require('../util/objectUtil');

module.exports.create = (authenticationConfig, repo, logger) => {
  const router = express.Router();

  const anonymousAuthorizer = authorizationFactory.create({ authorizationRules: anonymousAuthorizatonRules, repo, logger });
  router.use('/public', publicApiFactory.create({ repo, authorizer: anonymousAuthorizer, logger }));

  const { authenticate, loadUser } = auth0MiddlewareFactory.create(authenticationConfig.auth0, repo.user, logger);
  if (authenticate) {
    router.use(authenticate);
    if (loadUser) {
      router.use(loadUser);
    }

    router.get('/check-authenticated', (req, res) => {
      res.send({
        msg: 'Your access token was successfully validated!',
      });
    });

    const authorizer = authorizationFactory.create({ authorizationRules: authenticatedAuthorizatonRules, repo, logger });
    router.use('/answers', answerApiFactory.create({ repo, authorizer, logger }));
    router.use('/questions', questionApiFactory.create({ repo, authorizer, logger }));
    router.use('/users/me', usersMeApiFactory.create({ repo, authorizer, logger }));
    router.use('/users', baseEntityApiFactory.create({ repo, authorizer, entityType: 'user', logger }));
  }

  router.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    logger.error(err.stack);
    res.status(500).send(omit(err, ['stack']));
  });

  return router;
};

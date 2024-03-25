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

module.exports.create = (authenticationConfig, repo) => {
  const router = express.Router();

  const anonymousAuthorize = authorizationFactory.create({ authorizationRules: anonymousAuthorizatonRules, repo });
  router.use('/public', publicApiFactory.create({ repo, authorize: anonymousAuthorize }));

  const { authenticate, loadUser } = auth0MiddlewareFactory.create(authenticationConfig.auth0, repo.user);
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

    const authorize = authorizationFactory.create({ authorizationRules: authenticatedAuthorizatonRules, repo });
    router.use('/answers', answerApiFactory.create({ repo, authorize }));
    router.use('/questions', questionApiFactory.create({ repo, authorize }));
    router.use('/users/me', usersMeApiFactory.create({ repo, authorize }));
    router.use('/users', baseEntityApiFactory.create({ repo, authorize, entityType: 'user' }));
  }

  router.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send(omit(err, ['stack']));
  })

  return router;
};

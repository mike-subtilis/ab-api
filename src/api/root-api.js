const express = require('express');
const auth0MiddlewareFactory = require('./auth0-middleware');
const baseEntityApiFactory = require('./base-express-entity-api');
const publicApiFactory = require('./public-api');
const questionAnswerApiFactory = require('./question-answer-api');
const usersMeApiFactory = require('./users-me-api');
const hardcodedAuthorizaton = require('./hardcoded-authorization.json');
const authorizationFactory = require('./authorization-middleware');

module.exports.create = (authenticationConfig, repo) => {
  const router = express.Router();

  const authorize = authorizationFactory.create({ authorizationRules: hardcodedAuthorizaton, repo });

  router.use('/public', publicApiFactory.create({ repo, authorize }));

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

    router.use('/', questionAnswerApiFactory.create({ repo, authorize }));
    router.use('/questions', baseEntityApiFactory.create({ repo, authorize, entityType: 'question' }));
    router.use('/answers', baseEntityApiFactory.create({ repo, authorize, entityType: 'answer' }));
    router.use('/users/me', usersMeApiFactory.create({ repo, authorize }));
    router.use('/users', baseEntityApiFactory.create({ repo, authorize, entityType: 'user' }));
  }

  return router;
};

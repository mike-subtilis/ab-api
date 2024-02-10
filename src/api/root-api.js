const express = require('express');
const auth0MiddlewareFactory = require('./auth0-middleware');
const baseEntityApiFactory = require('./base-express-entity-api');
const publicApiFactory = require('./public-api');
const usersMeApiFactory = require('./users-me-api');

module.exports.create = (authenticationConfig, repo) => {
  const router = express.Router();

  router.use('/public', publicApiFactory.create(repo));

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

    router.use('/questions', baseEntityApiFactory.create(repo, 'question'));
    router.use('/answers', baseEntityApiFactory.create(repo, 'answer'));
    router.use('/users/me', usersMeApiFactory.create(repo));
    router.use('/users', baseEntityApiFactory.create(repo, 'user'));
  }

  return router;
};

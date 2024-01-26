const express = require('express');
const baseEntityApiFactory = require('./base-express-entity-api');
const auth0MiddlewareFactory = require('./auth0-middleware');
const publicApiFactory = require('./public-api');

module.exports.create = (authenticationConfig, repo) => {
  const router = express.Router();

  router.use('/public', publicApiFactory.create(repo));

  const { authenticate, loadUser } = auth0MiddlewareFactory.create(authenticationConfig.auth0, repo.user);
  if (authenticate) {
    router.use(authenticate);
    if (loadUser) {
      router.use(loadUser);

      router.get('/who-am-i', (req, res) => {
        res.send({
          msg: `You are ${JSON.stringify(req.user)}`,
        });
      });
    }

    router.get('/check-authenticated', (req, res) => {
      res.send({
        msg: 'Your access token was successfully validated!',
      });
    });

    router.use('/questions', baseEntityApiFactory.create(repo, 'question'));
    router.use('/users', baseEntityApiFactory.create(repo, 'user'));
  }

  return router;
};

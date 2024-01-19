const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const repoFactory = require('./database/repository');
const apiFactory = require('./api/root-api');

async function startServer() {
  const port = process.env.PORT || 3001;
  const repo = await repoFactory.create(config.database);

  const app = express();
  app.use(morgan('dev'));
  app.use(helmet());
  if (config.authentication.appOrigin) {
    app.use(cors({ origin: config.authentication.appOrigin }));
  }

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  app.use('/api', apiFactory.create(config.authentication, repo));

  app.listen(port, () => {
    console.log(`server is running on port ${port}...`);
  });
}

startServer();

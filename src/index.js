const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const repoFactory = require('./database/repository');
const apiFactory = require('./api/root-api');
const loggerFactory = require('./util/logger');

async function startServer() {
  const logger = loggerFactory.consoleLogger;

  const port = process.env.PORT || 3001;
  const repo = await repoFactory.create(config.database, logger);

  const app = express();
  app.use(morgan('dev'));
  app.use(helmet());
  if (config.authentication.appOrigin) {
    logger.debug(`configuring CORS with ${config.authentication.appOrigin}`);
    app.use(cors({ origin: config.authentication.appOrigin }));
  }

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  app.use('/api', apiFactory.create(config.authentication, repo, logger));
  app.get('/', (req, res) => {
    res.send('Welcome to the AnswerBrawl API');
  });

  app.listen(port, () => {
    logger.info(`server is running on port ${port}...`);
  });
}

startServer();

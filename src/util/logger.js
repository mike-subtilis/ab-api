const consoleOutput = (message, level) => {
  const messageOutput = typeof message === 'string'
    ? message
    : JSON.stringify(message);
  const lev = level.toUpper();
  const ts = new Date().toISOString();
  console.log(`${ts} [${lev}] ${messageOutput}`); // eslint-disable-line no-console
};

const consoleLogger = {
  error: error => consoleOutput(error, 'error'),
  warn: message => consoleOutput(message, 'warn'),
  info: message => consoleOutput(message, 'info'),
  debug: message => consoleOutput(message, 'debug'),
  trace: message => consoleOutput(message, 'trace'),
};

const chompLogger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  trace: () => {},
};

module.exports = {
  consoleLogger,
  chompLogger,
};

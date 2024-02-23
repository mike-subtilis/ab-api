const { reduce } = require('lodash');

module.exports.create = () => {
  function migrateV0V1(q) {
    const textTokens = q.text.split(' ');
    const newQ = {
      ...q,
      metric: textTokens[0],
      subject: textTokens.slice(1).join(' '),
      publicity: q.publicity || 'private',
      type: 'question',
      __schemaVersion: 1,
    };
    delete newQ.text;
    return newQ;
  }

  const migrations = [migrateV0V1];

  function migrateUp(question) {
    const migrationToApply = migrations[question.__schemaVersion || 0];
    if (!migrationToApply) {
      return question;
    }
    return migrationToApply(question);
  }

  function migrateUpAll(question) {
    if (question.__schemaVersion >= migrations.length) {
      return question;
    }
    const migrationsToApply = migrations.slice(question.__schemaVersion || 0);
    return reduce(
      migrationsToApply,
      (memo, nextMigration) => nextMigration(memo),
      question,
    );
  }

  return { migrateUpAll, migrateUp };
};

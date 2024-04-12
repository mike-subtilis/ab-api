const base = require('./base.json');
const answer = require('./answer.json');
const question = require('./question.json');
const questionAnswerStatistic = require('./questionAnswerStatistic.json');
const tag = require('./tag.json');
const user = require('./user.json');

module.exports = {
  base,
  tag: { ...tag, properties: { ...tag.properties, ...base.properties } },
  answer: { ...answer, properties: { ...answer.properties, ...base.properties } },
  question: { ...question, properties: { ...question.properties, ...base.properties } },
  questionAnswerStatistic,
  user: { ...user, properties: { ...user.properties, ...base.properties } },
};

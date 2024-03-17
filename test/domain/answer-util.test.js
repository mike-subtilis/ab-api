const sut = require('../../src/domain/answer-util');

describe('answer-util', () => {
  describe('selectAnswersForBallot()', () => {
    test('should produce correct values (1000 times)', () => {
      const validAnswers = ['1', '2', '3'];
      for (let i = 0; i < 1000; i += 1) {
        const answers = sut.selectAnswersForBallot(validAnswers);
        expect(validAnswers).toContain(answers[0]);
        expect(validAnswers).toContain(answers[1]);
      }
    });
  });
});

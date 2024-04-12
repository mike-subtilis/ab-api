module.exports = {
  selectAnswerIndexesForBallot(answerCount) {
    if (answerCount < 2) {
      throw new Error('There must be at least 2 potential answers to create a ballot.');
    }
    const firstIndex = Math.floor(Math.random() * answerCount);
    const rawSecondIndex = Math.floor(Math.random() * (answerCount - 1));
    const secondIndex = rawSecondIndex < firstIndex
      ? rawSecondIndex
      : rawSecondIndex + 1;
    return [
      firstIndex,
      secondIndex,
    ];
  },
  selectAnswersForBallot(potentialAnswerIds) {
    if (!potentialAnswerIds || potentialAnswerIds.length < 2) {
      throw new Error('There must be at least 2 potential answers to create a ballot.');
    }
    const firstIndex = Math.floor(Math.random() * potentialAnswerIds.length);
    const rawSecondIndex = Math.floor(Math.random() * (potentialAnswerIds.length - 1));
    const secondIndex = rawSecondIndex < firstIndex
      ? rawSecondIndex
      : rawSecondIndex + 1;
    return [
      potentialAnswerIds[firstIndex],
      potentialAnswerIds[secondIndex],
    ];
  },
};

const sutFactory = require('../../src/api/authorization-middleware');

describe('authorization-middleware.create()', () => {
  describe('basic constructor', () => {
    test('constructor requires parameters', () => {
      expect(() => sutFactory.create()).toThrow();
    });
    test('constructor requires entityRepo', () => {
      expect(() => sutFactory.create({ authorizationRules: {} })).toThrow();
    });
    test('constructor requires authorizationRules', () => {
      expect(() => sutFactory.create({ entityRepo: {} })).toThrow();
    });

    test('constructor with authorizationRules and entityRepo should create', () => {
      const sut = sutFactory.create({ authorizationRules: {}, entityRepo: {} });
      expect(sut).toBeDefined();
      expect(typeof sut).toBe('function');
    });
  });

  describe('authorization checking', () => {
    let sut;
    beforeAll(() => {
      const mockRules = {
        'sample:read': true,
        'sample:create': true,
        'sample:update': true,
        'sample:delete': true,
      };
      const sampleEntities = {
        1: { id: 1, name: 'mock-1', fieldInt: 11 },
        2: { id: 2, name: 'mock-2', fieldInt: 22 },
      };
      const mockRepo = { get: id => sampleEntities[id] };
      sut = sutFactory.create({ authorizationRules: mockRules, entityRepo: mockRepo });
    });

    test('undefined grant should fail', () => {
      const middleware = sut('sample:something');
      let resultException;
      middleware(null, null, (ex) => { resultException = ex; });
      expect(resultException).toBeDefined();
      expect(resultException.message).toMatch(/sample:something/);
    });
  });
});

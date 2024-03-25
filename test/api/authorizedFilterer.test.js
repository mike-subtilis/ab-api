const sutFactory = require('../../src/api/authorizationFilterer');

describe('authorizedFilterGenerator', () => {
  describe('User vs Target rule', () => {
    let sut;
    beforeAll(() => {
      const mockRules = {
        'foo:list': [
          {
            "name": "anyone can list all foos",
            "matches": true
          },
        ],
      };
      sut = sutFactory.create({ authorizationRules: mockRules });
    });

    test('', () => {
      const result = sut.getListFilters('foo:list', { user: { id: 'mock-user-1' } });
      expect(result).toEqual([]);
    });
  });

  describe('User vs Target rule', () => {
    let sut;
    beforeAll(() => {
      const mockRules = {
        'foo:list': [
          {
            "name": "users can list their own foos",
            "matches": [
              { "user": "id", "target": "createdBy" }
            ]
          },
        ],
      };
      sut = sutFactory.create({ authorizationRules: mockRules });
    });

    test('', () => {
      const result = sut.getListFilters('foo:list', { id: 'mock-user-1' });
      expect(result).toEqual([{ createdBy: 'mock-user-1' }]);
    });
  });

  describe('2 AND rules', () => {
    let sut;
    beforeAll(() => {
      const mockRules = {
        'foo:list': [
          {
            "name": "users can list foos with 1 bar AND 'test' baz",
            "matches": [
              { "target": "bar", "fixed": 1 },
              { "target": "baz", "fixed": "test" },
            ],
          },
        ],
      };
      sut = sutFactory.create({ authorizationRules: mockRules });
    });

    test('', () => {
      const result = sut.getListFilters('foo:list', { id: 'mock-user-1' });
      expect(result).toEqual([{ bar: 1, baz: 'test' }]);
    });
  });

  describe('2 OR rules', () => {
    let sut;
    beforeAll(() => {
      const mockRules = {
        'foo:list': [
          {
            "name": "users can list foos with 1 bar",
            "matches": [
              { "target": "bar", "fixed": 1 },
            ],
          },
          {
            "name": "users can list foos with 2 bar and 'test' baz",
            "matches": [
              { "target": "bar", "fixed": 2 },
              { "target": "baz", "fixed": "test" },
            ],
          },
        ],
      };
      sut = sutFactory.create({ authorizationRules: mockRules });
    });

    test('', () => {
      const result = sut.getListFilters('foo:list', { id: 'mock-user-1' });
      expect(result).toEqual([{ bar: 1 }, { bar: 2, baz: 'test' }]);
    });
  });

  describe('User vs Fixed rule', () => {
    let sut;
    beforeAll(() => {
      const mockRules = {
        'foo:list': [
          {
            "name": "paying users can list all foos",
            "matches": [
              { "user": "isPaying", "fixed": true }
            ]
          },
        ],
        'bar:list': [
          {
            "name": "paying users can list baz 1",
            "matches": [
              { "user": "isPaying", "fixed": true },
              { "target": "baz", "fixed": 1 },
            ]
          },
          {
            "name": "all users can list baz 2 (paying or non-paying)",
            "matches": [
              { "target": "baz", "fixed": 2 },
            ]
          },
        ],
      };
      sut = sutFactory.create({ authorizationRules: mockRules });
    });

    test('paying users can list all foos', () => {
      const result = sut.getListFilters('foo:list', { id: 'mock-user-1', isPaying: true });
      expect(result).toEqual([]);
    });

    test('non-paying users can\'t list any foos', () => {
      const user2 = { id: 'mock-user-2', isPaying: false };
      expect(() => sut.getListFilters('foo:list', user2)).toThrow(Error);
    });

    test('paying users can list all bars with 1 baz or 2 baz', () => {
      const result = sut.getListFilters('bar:list', { id: 'mock-user-1', isPaying: true });
      expect(result).toEqual([{ baz: 1 }, { baz: 2 }]);
    });

    test('non-paying users can list all bars with 2 baz', () => {
      const result = sut.getListFilters('bar:list', { id: 'mock-user-2', isPaying: false });
      expect(result).toEqual([{ baz: 2 }]);
    });
  });
});

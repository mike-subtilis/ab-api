const sutFactory = require('../../src/api/authorization-middleware');

describe('authorization-middleware.create()', () => {
  describe('basic constructor', () => {
    test('constructor requires parameters', () => {
      expect(() => sutFactory.create()).toThrow();
    });
    test('constructor requires repo', () => {
      expect(() => sutFactory.create({ authorizationRules: {} })).toThrow();
    });
    test('constructor requires authorizationRules', () => {
      expect(() => sutFactory.create({ repo: {} })).toThrow();
    });

    test('constructor with authorizationRules and entityRepo should create', () => {
      const sut = sutFactory.create({ authorizationRules: {}, repo: {} });
      expect(sut).toBeDefined();
      expect(typeof sut).toBe('object');
      expect(typeof sut.check).toBe('function');
      expect(typeof sut.filter).toBe('function');
    });
  });

  describe('authorization checking', () => {
    let sut;
    beforeAll(() => {
      const mockRules = {
        'sample:read': true,
        'sample:create': true,
        'sample:update': [
          {
            "name": "users can update their own samples",
            "matches": [
              { "user": "id", "target": "createdBy" }
            ]
          },
        ],
        'sample:delete': true,
      };
      const sampleEntities = {
        1: { id: 1, name: 'mock-1', fieldInt: 1.1, createdBy: 'user-1' },
        2: { id: 2, name: 'mock-2', fieldInt: 2.2, createdBy: 'user-2' },
        11: { id: 11, name: 'mock-11', fieldInt: 11.11, createdBy: 'user-1' },
      };
      const sampleMockRepo = { get: id => sampleEntities[id] };
      sut = sutFactory.create({ authorizationRules: mockRules, repo: { sample: sampleMockRepo } });
    });

    test('undefined grant should fail', (done) => {
      const middleware = sut.check('sample:something');

      middleware({}, {}, (nextErr) => {
        try {
          expect(nextErr).toBeDefined();
          expect(nextErr.message).toMatch(/sample:something/);
          done();
        } catch (doneErr) {
          done(doneErr);
        }
      });
    });

    test('users can read any sample', (done) => {
      const middleware = sut.check('sample:read');

      middleware({ user: { id: 'user-1' }, params: { id: '999' } },
        {},
        (nextErr) => {
          try {
            expect(nextErr).not.toBeDefined();
            done();
          } catch (doneErr) {
            done(doneErr);
          }
        });
    });

    test('users can update their own samples', (done) => {
      const middleware = sut.check('sample:update');

      middleware({ user: { id: 'user-1' }, params: { id: '1' } },
        {},
        (nextErr) => {
          try {
            expect(nextErr).not.toBeDefined();
            done();
          } catch (doneErr) {
            done(doneErr);
          }
        });
    });

    test('users cant update other users samples', (done) => {
      const middleware = sut.check('sample:update');

      middleware({ user: { id: 'user-1' }, params: { id: '2' } },
        {},
        (nextErr) => {
          try {
            expect(nextErr).toBeDefined();
            expect(nextErr.message).toMatch(/sample:update/);
            done();
          } catch (doneErr) {
            done(doneErr);
          }
        });
    });

    test('users cant update non-existant samples', (done) => {
      const middleware = sut.check('sample:update');

      middleware({ user: { id: 'user-1' }, params: { id: '999' } },
        {},
        (nextErr) => {
          try {
            expect(nextErr).toBeDefined();
            expect(nextErr.message).toMatch(/sample:update/);
            done();
          } catch (doneErr) {
            done(doneErr);
          }
        });
    });
  });
});

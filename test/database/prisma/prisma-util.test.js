const sut = require('../../../src/database/prisma/prisma-util');

describe('prisma-util', () => {
  describe('getFieldToSet()', () => {
    const schema = {
      properties: {
        foo: { type: 'string' },
        barrayobj: { type: 'array', items: { type: 'object' } },
        barraynum: { type: 'array', items: { type: 'number' } },
        bobj: { type: 'object' },
      },
    };

    test('should do a simple value return without schema', () => {
      const result = sut.getFieldToSet('basic', 'k');
      expect(result).toEqual('basic');
    });

    test('should return undefined for unknown property in schema', () => {
      expect(sut.getFieldToSet('baz', 'bar', schema)).toBeUndefined();
    });

    test('should return the value for known primitive property in schema', () => {
      expect(sut.getFieldToSet('fooval', 'foo', schema)).toEqual('fooval');
    });

    test('should return a connector for known object property in schema', () => {
      expect(sut.getFieldToSet('id-1', 'bobj', schema))
        .toEqual({ connect: { id: 'id-1' } });
    });

    test('should return a setter for known object property in schema when updating', () => {
      expect(sut.getFieldToSet('id-1', 'bobj', schema, true))
        .toEqual({ set: { id: 'id-1' } });
    });

    test('should return a setter for known object array property in schema when updating', () => {
      expect(sut.getFieldToSet(['id-1', 'id-2', 'id-3'], 'barrayobj', schema, true))
        .toEqual({ set: [{ id: 'id-1' }, { id: 'id-2' }, { id: 'id-3' }] });
    });
  });
});

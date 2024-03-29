const { asyncEvery, asyncSome, intersection } = require('../util/arrayUtil');

module.exports.create = ({ authorizationRules, repo }) => {
  function doValuesMatch(a, b) {
    if (Array.isArray(a)) {
      if (Array.isArray(b)) {
        return intersection(a, b).length > 0;
      }
      return a.includes(b);
    }
    if (Array.isArray(b)) {
      return b.includes(a);
    }
    return a === b;
  }

  async function passesGrantPolicyMatch(entityType, m, req) {
    // m: { user, target, fixed } <-- must have exactly 2 of those fields
    if (!Object.keys(m).length === 2) {
      throw new Error(`Grant policy match should have exactly 2 fields (found ${Object.keys(m).join(',')})`);
    }
    const operands = [];
    if (m.user) {
      if (req.user) {
        operands.push(req.user[m.user]);
      } else {
        operands.push('anonymous');
      }
    }
    if (m.fixed) {
      operands.push(m.fixed);
    }
    if (m.target) {
      if (req._cache && req._cache.target) {
        operands.push(req._cache.target[m.target]);
      }
      const mockedTarget = { ...req.params, ...req.query };
      if (mockedTarget[m.target]) {
        operands.push(mockedTarget[m.target]);
      } else {
        const target = await repo[entityType].get(req.params.id);
        if (!target) {
          return false;
        }
        req._cache = req._cache || {};
        req._cache.target = target;
        operands.push(target[m.target]);
      }
    }
    return doValuesMatch(operands[0], operands[1]);
  }

  async function passesGrantPolicy(entityType, p, req) {
    // p: { name, matches: true || [{ user, target, fixed }], fields: [] }
    if (p.fields) {
      if (Object.keys(req.body || {}).some(k => !p.fields.includes(k))) {
        return false;
      }
    }
    if (typeof p.matches === 'boolean' && !p.matches) {
      return false;
    }
    if (Array.isArray(p.matches)) {
      const matchesEvery = await asyncEvery(p.matches, async m => passesGrantPolicyMatch(entityType, m, req));
      if (!matchesEvery) {
        return false;
      }
    }

    return true;
  }

  async function passesGrantPolicies(entityType, grantKey, req) {
    if (Object.hasOwn(authorizationRules, grantKey) && authorizationRules[grantKey]) {
      const grantPolicies = authorizationRules[grantKey];
      if (typeof grantPolicies === 'boolean') {
        return true;
      }
      if (Array.isArray(grantPolicies)) {
        const somePoliciesPass = await asyncSome(grantPolicies, async p => passesGrantPolicy(entityType, p, req));
        if (somePoliciesPass) {
          return true;
        }
      } else {
        throw new Error(`Grant policies for ${grantKey} are not well defined`);
      }
    }
    return false;
  }

  async function hasGrant(grantKey, req) {
    const tokens = grantKey.split(':');
    const entityType = tokens[0];
    const actionType = tokens[1];
    // const subActionType = tokens.length > 2 ? tokens[2] : null;

    if (await passesGrantPolicies(entityType, grantKey, req)) {
      return true;
    }
    const parentGrantKey = `${entityType}:${actionType}`;
    if (parentGrantKey !== grantKey && await passesGrantPolicies(entityType, parentGrantKey, req)) {
      return true;
    }
    return false;
  }

  return {
    hasGrant,
    passesGrantPolicies,
    passesGrantPolicy,
    passesGrantPolicyMatch,
    doValuesMatch,
  };
};

const { asyncEvery, asyncSome, intersection } = require('../util/arrayUtil');

module.exports.create = ({ authorizationRules, entityRepo }) => {
  if (!authorizationRules) {
    throw new Error('Authorization Rules are required to set up the authorization-middleware');
  }
  if (!entityRepo) {
    throw new Error('Entity Repo is required to set up the authorization-middleware');
  }

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

  async function passesGrantPolicyMatch(m, req) {
    // m: { user, target, fixed } <-- must have exactly 2 of those fields
    if (!Object.keys(m).length === 2) {
      throw new Error(`Grant policy match should have exactly 2 fields (found ${Object.keys(m).join(',')})`);
    }
    const operands = [];
    if (m.user) {
      operands.push(req.user[m.user]);
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
        const target = await entityRepo.get(req.params.id);
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

  async function passesGrantPolicy(p, req) {
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
      const matchesEvery = await asyncEvery(p.matches, async m => passesGrantPolicyMatch(m, req));
      if (!matchesEvery) {
        return false;
      }
    }

    return true;
  }

  async function passesGrantPolicies(grantKey, req) {
    if (Object.hasOwn(authorizationRules, grantKey) && authorizationRules[grantKey]) {
      const grantPolicies = authorizationRules[grantKey];
      if (typeof grantPolicies === 'boolean') {
        return true;
      }
      if (Array.isArray(grantPolicies)) {
        const somePoliciesPass = await asyncSome(grantPolicies, async p => passesGrantPolicy(p, req));
        if (somePoliciesPass) {
          return true;
        }
      } else {
        throw new Error(`Grant policies for ${grantKey} are not well defined`);
      }
    }
    return false;
  }

  return grantKey => ((req, res, next) => {
    try {
      const tokens = grantKey.split(':');
      const entityType = tokens[0];
      const actionType = tokens[1];
      // const subActionType = tokens.length > 2 ? tokens[2] : null;

      const parentGrantKey = `${entityType}:${actionType}`;
      if (passesGrantPolicies(grantKey, req)) {
        next();
      } else if (parentGrantKey !== grantKey && passesGrantPolicies(parentGrantKey, req)) {
        next();
      }
    } catch (ex) {
      next(ex);
    }
    next(new Error(`You do not have '${grantKey}' access to this endpoint`));
  });
};

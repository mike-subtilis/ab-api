const { asyncEvery, asyncSome, intersection } = require('../util/arrayUtil');

module.exports.create = ({ authorizationRules }) => {
  function getMatchFilter(m, user) {
    // m = { user, target, fixed }
    if (m.user && m.fixed) {
      if (Array.isArray(m.fixed)) {
        return m.fixed.some(v => user[m.user] === v);
      }
      return user[m.user] === m.fixed;
    }

    const fixedOperand = m.fixed || user[m.user];
    return { [m.target]: fixedOperand };
  }

  function getPolicyFilter(p, user) {
    // p: { name, matches: true || [{ user, target, fixed }], fields: [] }
    if (!p.matches) {
      return false;
    }
    if (Array.isArray(p.matches)) {
      const matchResults = p.matches.map(m => getMatchFilter(m, user));
      if (matchResults.some(r => !r)) {
        return false;
      }
      const fieldMatchResults = matchResults.filter(r => typeof r === 'object');
      if (fieldMatchResults.length === 0) {
        return true;
      }
      return fieldMatchResults.reduce((memo, r) => ({ ...memo, ...r }));
    }

    return true;
  }

  function getAllPolicyFilters(entityType, grantKey, user) {
    if (Object.hasOwn(authorizationRules, grantKey) && authorizationRules[grantKey]) {
      const grantPolicies = authorizationRules[grantKey];
      if (typeof grantPolicies === 'boolean') { // and is TRUE by above check
        return [];
      }
      if (Array.isArray(grantPolicies)) {
        const allPolicyFilters = grantPolicies.map(p => getPolicyFilter(p, user));
        if (allPolicyFilters.every(pf => !pf)) {
          throw new Error(`This user is not able to list ${entityType} with the current ${grantKey} rules.`);
        }
        if (allPolicyFilters.some(pf => typeof pf === 'boolean' && pf)) {
          return []; // at least 1 policy filter allows unfiltered access
        }
        return allPolicyFilters.filter(pf => typeof pf === 'object');
      } else {
        throw new Error(`Grant policies for ${grantKey} are not well defined`);
      }
    }
    throw new Error(`This user is not able to list ${entityType} with the current ${grantKey} rules.`);
  }

  function getListFilters(grantKey, user) {
    const tokens = grantKey.split(':');
    const entityType = tokens[0];

    const filters = getAllPolicyFilters(entityType, grantKey, user);
    return filters;
  }

  return { getListFilters };
};

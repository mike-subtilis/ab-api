const crypto = require('crypto');

module.exports = {
  getHash(...fields) {
    const hash = crypto.createHash('sha1');
    const input = fields
      .map((f) => {
        if (Array.isArray(f)) {
          return f.join(',');
        }
        if (typeof f === 'object') {
          return JSON.stringify(f);
        }
        return f;
      })
      .join(',');
    return hash.update(input).digest('hex');
  },
};

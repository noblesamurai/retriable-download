const fs = require('fs');
const tempy = require('tempy');
const path = require('path');
const request = require('request');
const retriableErrorCodes = ['ECONNRESET', 'ETIMEOUT', 'ESOCKETTIMEDOUT', 'ENON2xx'];

function statusCodeError (code, uri) {
  const error = new Error(`non 2xx response - ${code}: ${uri}`);
  error.cause = { code: 'ENON2xx' };
  return error;
}

module.exports = function retryDownload (uri, retries = 3, requestOpts = {}) {
  return new Promise((resolve, reject) => {
    const r = request({ ...requestOpts, uri });

    r.once('response', function (response) {
      if (!/^2[0-9][0-9]$/.exec(response.statusCode)) {
        this.abort();
        const error = statusCodeError(response.statusCode, uri);
        return onError(error);
      }
      const { pathname } = new URL(uri);
      const filename = tempy.file({ extension: path.extname(pathname) });
      const writable = fs.createWriteStream(filename);
      writable.once('finish', () => {
        return resolve(filename);
      });

      r.pipe(writable);
    }).once('error', onError);

    function onError (err) {
      if (retries <= 0 || !retriableErrorCodes.includes(err.cause && err.cause.code)) return reject(err);
      return resolve(retryDownload(uri, retries - 1, requestOpts));
    }
  });
};

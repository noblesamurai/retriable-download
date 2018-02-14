const fs = require('fs');
const tempy = require('tempy');
const request = require('request');
const retriableErrorCodes = ['ECONNRESET', 'ETIMEOUT', 'ESOCKETTIMEDOUT', 'ENON2xx'];

function statusCodeError (code) {
  const error = new Error(`non 2xx response - ${code}`);
  error.cause = { code: 'ENON2xx' };
  return error;
}

module.exports = function retryDownload (retries, ...args) {
  const filename = tempy.file();
  const writable = fs.createWriteStream(filename);
  return new Promise((resolve, reject) => {
    writable.once('finish', () => {
      return resolve(filename);
    });

    const r = request(...args);

    r.once('response', function (response) {
      if (!/^2[0-9][0-9]$/.exec(response.statusCode)) {
        this.abort();
        const error = statusCodeError(response.statusCode);
        return onError(error);
      }
      r.pipe(writable);
    }).once('error', onError);

    function onError (err) {
      if (retries <= 0 || !retriableErrorCodes.includes(err.cause && err.cause.code)) return reject(err);
      return resolve(retryDownload(retries - 1, ...args));
    }
  });
};

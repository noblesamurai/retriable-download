const fs = require('fs');
const tempy = require('tempy');
const request = require('request');
const retriableErrorCodes = ['ECONNRESET', 'ETIMEOUT', 'ESOCKETTIMEDOUT'];

module.exports = function retryDownload (retries, ...args) {
  return new Promise((resolve, reject) => {
    const filename = tempy.file();
    const writable = fs.createWriteStream(filename);

    writable.once('finish', () => {
      return resolve(filename);
    });

    const r = request(...args);

    r.once('response', function (response) {
      if (!/^2[0-9][0-9]$/.exec(response.statusCode)) {
        this.abort();
        return reject(new Error(`non 2xx response - ${response.statusCode}`));
      }
      r.pipe(writable);
    }).once('error', function (err) {
      if (retries <= 0 || !retriableErrorCodes.includes(err.cause && err.cause.code)) return reject(err);
      return resolve(retryDownload(retries - 1, ...args));
    });
  });
};

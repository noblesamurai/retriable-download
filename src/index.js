const got = require('got');
const pEvent = require('p-event');
const path = require('path');
const pipe = require('multipipe');
const tempfile = require('tempfile');
const { URL } = require('url');
const { createWriteStream } = require('fs');

function statusCodeError (code, uri) {
  const error = new Error(`non 2xx response - ${code}: ${uri}`);
  error.cause = { code: 'ENON2xx' };
  return error;
}

async function retryDownload (uri, retryCount = 3) {
  const { pathname } = new URL(uri);
  const input = got.stream(uri, { throwHttpErrors: false });
  try {
    const response = await pEvent(input, 'response');
    if (!/^2[0-9]{2}$/.exec(response.statusCode)) {
      input.destroy();
      throw statusCodeError(response.statusCode, uri);
    }
  } catch (error) {
    if (retryCount > 0) return retryDownload(uri, retryCount - 1);
    throw error;
  }
  const filename = tempfile(path.extname(pathname));
  const output = createWriteStream(filename);
  await pipe(input, output);
  return filename;
}

module.exports = retryDownload;

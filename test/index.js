const expect = require('chai').expect;
const nock = require('nock');
const download = require('..');
const fs = require('fs');
const { promisify } = require('util');
const access = promisify(fs.access);

describe('retriable-download', function () {
  let rejected = false;
  it('works on 200', function () {
    const retries = 3;
    const scope = nock('http://isthere').get('/thing').reply(200, 'found');

    return download(retries, 'http://isthere/thing').catch((err) => {
      rejected = err;
    }).then((filename) => {
      expect(rejected).to.equal(false);
      expect(scope.isDone()).to.equal(true);
      expect(filename).to.be.a('string');
      return access(filename, fs.constants.R_OK);
    });
  });

  it('retries on 404', function () {
    const retries = 3;
    const scope = nock('http://notthere').get('/thing').times(4).reply(404, 'notfound');

    return download(retries, 'http://notthere/thing').catch((err) => {
      rejected = err;
    }).then(() => {
      expect(scope.isDone()).to.equal(true);
      expect(rejected && rejected.cause && rejected.cause.code).to.equal('ENON2xx');
    });
  });

  it('retries on transient errors', function () {
    const retries = 3;
    const error = new Error('connection reset punk');
    error.cause = { code: 'ECONNRESET' };

    const scope = nock('http://transient').get('/thing')
      .twice().replyWithError(error)
      .get('/thing')
      .once().reply(200, 'ok');

    return download(retries, 'http://transient/thing').then(() => {
      expect(scope.isDone(), `still waiting on mocks: ${scope.pendingMocks()}`).to.equal(true);
    });
  });
});

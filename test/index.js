const expect = require('chai').expect;
const nock = require('nock');
const download = require('..');

describe('my thing', function () {
  let rejected = false;
  it('rejects immediately on 404', function () {
    const retries = 3;
    const scope = nock('http://notthere').get('/thing').reply(404, 'notfound');

    return download(retries, 'http://notthere/thing').catch(() => {
      rejected = true;
    }).then(() => {
      expect(scope.isDone()).to.equal(true);
      expect(rejected).to.equal(true);
    });
  });

  it('retries on transient errors', function () {
    this.timeout(5000);
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

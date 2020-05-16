const nock = require('nock')

exports.mockAccessToken = () => {
  nock('https://api.github.com')
    .post('/app/installations/321696/access_tokens')
    .reply(200, { token: 'test' })
}

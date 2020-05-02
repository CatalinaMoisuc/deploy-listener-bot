const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const { Probot } = require('probot')

// Requiring our fixtures
const eventPayloadDeploymentStatus = require('./fixtures/event.deployment_status')

const fs = require('fs')
const path = require('path')

describe('My Probot app', () => {
  let probot
  let mockCert

  beforeAll((done) => {
    fs.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), (err, cert) => {
      if (err) return done(err)
      mockCert = cert
      done()
    })
  })

  beforeEach(() => {
    nock.disableNetConnect()

    probot = new Probot({ id: 1, cert: mockCert })
    // Load our app into probot
    probot.load(myProbotApp)
  })

  test('labels issue when deployment is successful', async () => {
    // the post addLabelToIssue is timing out with jamine's default 5000ms
    jest.setTimeout(6000)

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/321696/access_tokens')
      .reply(200, { token: 'test' })

    nock('https://api.github.com')
      .get('/repos/Toto/testing-repo/compare/test-env-old...007')
      .reply(200, { commits: [{ sha: '007' }] })

    nock('https://api.github.com')
      .get('/search/issues?q=007+repo:Toto/testing-repo')
      .reply(200, { items: [{ body: '#1', number: '2' }] })

    const addLabelToIssue = nock('https://api.github.com')
      .post('/repos/Toto/testing-repo/issues/1/labels'
        , (body) => {
          expect(body).toMatchObject(['test-env'])
          return true
        }
      )
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'deployment_status', payload: eventPayloadDeploymentStatus })

    // the issue was labeled successfully
    expect(addLabelToIssue.isDone()).toBe(true)
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})

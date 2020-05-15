const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const { Probot } = require('probot')

// Requiring our fixtures
const eventPayloadTestEnv = require('./fixtures/event.deployment_status.test-env')
const eventPayloadTestProd = require('./fixtures/event.deployment_status.test-prod')

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

  test('adds and removes labels issue when deployment is successful', async () => {
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

    const getLabelsFromIssue = nock('https://api.github.com')
      .get('/repos/Toto/testing-repo/issues/1')
      .reply(200, { labels: [{ name: 'needs review' }] })

    const removeLabelFromIssue = nock('https://api.github.com')
      .delete('/repos/Toto/testing-repo/issues/1/labels/needs%20review')
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'deployment_status', payload: eventPayloadTestEnv })

    // the issue was labeled and unlabeled successfully
    expect(addLabelToIssue.isDone()).toBe(true)
    expect(getLabelsFromIssue.isDone()).toBe(true)
    expect(removeLabelFromIssue.isDone()).toBe(true)
  })

  test('removes multiple issue labels', async () => {
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

    nock('https://api.github.com')
      .post('/repos/Toto/testing-repo/issues/1/labels'
        , (body) => {
          expect(body).toMatchObject(['test-env'])
          return true
        }
      )
      .reply(200)

    nock('https://api.github.com')
      .get('/repos/Toto/testing-repo/issues/1')
      .reply(200, { labels: [{ name: 'needs review' }, { name: 'test-close' }] })

    const removeNeedsReviewFromIssue = nock('https://api.github.com')
      .delete('/repos/Toto/testing-repo/issues/1/labels/needs%20review')
      .reply(200)

    const removeTestCloseFromIssue = nock('https://api.github.com')
      .delete('/repos/Toto/testing-repo/issues/1/labels/test-close')
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'deployment_status', payload: eventPayloadTestEnv })

    expect(removeNeedsReviewFromIssue.isDone()).toBe(true)
    expect(removeTestCloseFromIssue.isDone()).toBe(true)
  })

  test('closes issue when deployment is successful in last deploy env', async () => {
    // the post addLabelToIssue is timing out with jamine's default 5000ms
    jest.setTimeout(6000)

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/321696/access_tokens')
      .reply(200, { token: 'test' })

    nock('https://api.github.com')
      .get('/repos/Toto/testing-repo/compare/test-close-old...007')
      .reply(200, { commits: [{ sha: '007' }] })

    nock('https://api.github.com')
      .get('/search/issues?q=007+repo:Toto/testing-repo')
      .reply(200, { items: [{ body: '#1', number: '2' }] })

    nock('https://api.github.com')
      .post('/repos/Toto/testing-repo/issues/1/labels')
      .reply(200)

    nock('https://api.github.com')
      .get('/repos/Toto/testing-repo/issues/1')
      .reply(200, { labels: [{ name: 'test-env' }] })

    nock('https://api.github.com')
      .delete('/repos/Toto/testing-repo/issues/1/labels/test-env')
      .reply(200)

    const closeIssue = nock('https://api.github.com')
      .patch('/repos/Toto/testing-repo/issues/1'
        , (body) => {
          expect(body).toMatchObject({ state: 'closed' })
          return true
        }
      )
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'deployment_status', payload: eventPayloadTestProd })

    // the issue deployed in the last stage was closed
    expect(closeIssue.isDone()).toBe(true)
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})

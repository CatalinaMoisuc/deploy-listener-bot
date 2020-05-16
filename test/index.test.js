const nock = require('nock')
const { mockAccessToken } = require('./mocks/mock-token')
const { mockCompare, mockSearch, mockAddLabel, mockRemoveLabel, mockGetIssue, mockCloseIssue } = require('./mocks/mock-oktokit-rest')

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

    // some tests are timing out with jamine's default (5000ms)
    jest.setTimeout(6000)

    // Test that we correctly return a test token
    mockAccessToken()
  })

  beforeEach(() => {
    nock.disableNetConnect()

    probot = new Probot({ id: 1, cert: mockCert })
    // Load our app into probot
    probot.load(myProbotApp)
  })

  test('adds and removes labels issue when deployment is successful', async () => {
    mockCompare('test-env-old', '007', { commits: [{ sha: '007' }] })
    mockSearch('007+repo:Toto/testing-repo', { items: [{ body: '#1', number: '2' }] })

    const getLabelsFromIssue = mockGetIssue('1', { labels: [{ name: 'needs review' }] })
    const addLabelToIssue = mockAddLabel('1', (body) => { expect(body).toMatchObject(['test-env']) })
    const removeLabelFromIssue = mockRemoveLabel('1', 'needs%20review')

    // Receive a webhook event
    await probot.receive({ name: 'deployment_status', payload: eventPayloadTestEnv })

    // the issue was labeled and unlabeled successfully
    expect(addLabelToIssue.isDone()).toBe(true)
    expect(getLabelsFromIssue.isDone()).toBe(true)
    expect(removeLabelFromIssue.isDone()).toBe(true)
  })

  test('removes multiple issue labels', async () => {
    mockCompare('test-env-old', '007', { commits: [{ sha: '007' }] })
    mockSearch('007+repo:Toto/testing-repo', { items: [{ body: '#1', number: '2' }] })
    mockGetIssue('1', { labels: [{ name: 'needs review' }, { name: 'test-close' }] })
    mockAddLabel('1', () => {})

    const removeNeedsReviewFromIssue = mockRemoveLabel('1', 'needs%20review')
    const removeTestCloseFromIssue = mockRemoveLabel('1', 'test-close')

    // Receive a webhook event
    await probot.receive({ name: 'deployment_status', payload: eventPayloadTestEnv })

    expect(removeNeedsReviewFromIssue.isDone()).toBe(true)
    expect(removeTestCloseFromIssue.isDone()).toBe(true)
  })

  test('does not remove the current deploy environment label', async () => {
    mockCompare('test-env-old', '007', { commits: [{ sha: '007' }] })
    mockSearch('007+repo:Toto/testing-repo', { items: [{ body: '#1', number: '2' }] })
    mockGetIssue('1', { labels: [{ name: 'needs review' }, { name: 'test-env' }] })
    mockAddLabel('1', () => {})

    const removeNeedsReviewFromIssue = mockRemoveLabel('1', 'needs%20review')
    const removeTestEnvFromIssue = mockRemoveLabel('1', 'test-env')

    // Receive a webhook event
    await probot.receive({ name: 'deployment_status', payload: eventPayloadTestEnv })

    expect(removeNeedsReviewFromIssue.isDone()).toBe(true)
    expect(removeTestEnvFromIssue.isDone()).toBe(false)
  })

  test('closes issue when deployment is successful in last deploy env', async () => {
    mockCompare('test-close-old', '007', { commits: [{ sha: '007' }] })
    mockSearch('007+repo:Toto/testing-repo', { items: [{ body: '#1', number: '2' }] })
    mockGetIssue('1', { labels: [{ name: 'test-env' }] })
    mockAddLabel('1', (body) => { expect(body).toMatchObject(['test-close']) })
    mockRemoveLabel('1', 'test-env')

    const closeIssue = mockCloseIssue('1')

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

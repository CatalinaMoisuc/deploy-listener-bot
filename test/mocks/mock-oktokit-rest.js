const nock = require('nock')

exports.mockCompare = (tag, commit, responseBody) => {
  return nock('https://api.github.com')
    .get(`/repos/Toto/testing-repo/compare/${tag}...${commit}`)
    .reply(200, responseBody)
}

exports.mockSearch = (query, responseBody) => {
  return nock('https://api.github.com')
    .get(`/search/issues?q=${query}`)
    .reply(200, responseBody)
}

exports.mockAddLabel = (issueNumber, expectBody) => {
  return nock('https://api.github.com')
    .post(`/repos/Toto/testing-repo/issues/${issueNumber}/labels`
      , (body) => {
        expectBody(body)
        // expect(body).toMatchObject(['test-env'])
        return true
      }
    )
    .reply(200)
}

exports.mockRemoveLabel = (issueNumber, label) => {
  return nock('https://api.github.com')
    .delete(`/repos/Toto/testing-repo/issues/${issueNumber}/labels/${label}`)
    .reply(200)
}

exports.mockGetIssue = (issueNumber, respnseBody) => {
  return nock('https://api.github.com')
    .get(`/repos/Toto/testing-repo/issues/${issueNumber}`)
    .reply(200, respnseBody)
}

exports.mockCloseIssue = (issueNumber) => {
  return nock('https://api.github.com')
    .patch(`/repos/Toto/testing-repo/issues/${issueNumber}`
      , (body) => {
        expect(body).toMatchObject({ state: 'closed' })
        return true
      }
    )
    .reply(200)
}

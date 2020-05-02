/**
 * This is the main entrypoint to the Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  app.on('deployment_status.created', async context => {
    const deployStatus = context.payload.deployment_status.state

    if (deployStatus === 'success') {
      const deployCommitSha = context.payload.deployment.sha
      const deployEnvironment = context.payload.deployment.environment

      const repositoryFullName = context.payload.repository.full_name
      const repositoryName = context.payload.repository.name
      const repositoryOwnerLogin = context.payload.repository.owner.login

      // compare previously deployed tag
      const comparison = await context.github.repos.compareCommits({
        base: `${deployEnvironment}-old`,
        head: `${deployCommitSha}`,
        repo: `${repositoryName}`,
        owner: `${repositoryOwnerLogin}`
      })

      // get the commits between the old and the new deployed tag
      const { commits } = comparison.data

      // for each commit sha
      for (const commit of commits) {
        app.log(`Handling deployment head commit: ${commit.sha}`)

        const query = `${commit.sha}+repo:${repositoryFullName}`

        // find all pull requests that contained this commit sha
        const { data } = await context.github.search.issuesAndPullRequests({
          q: query
        })
        const { items } = data

        // for each pull request that contains a deployed commit hash
        for (const pr of items) {
          app.log(`Handling pr: ${pr.number}`)
          const body = pr.body

          // match all issue numbers mentioned in the description
          const issuesMentioned = body.match(/#[0-9]+/g)
          app.log(`Handling the following mentioned issues: ${issuesMentioned}`)

          // and label each issue mentioned in the PRs description with the environment label
          for (const issue of issuesMentioned) {
            const issueNumber = parseInt(issue.slice(1))
            app.log(`Handling issue: ${issueNumber}`)

            await context.github.issues.addLabels({
              repo: `${repositoryName}`,
              owner: `${repositoryOwnerLogin}`,
              issue_number: issueNumber,
              labels: [`${deployEnvironment}`]
            })

            // when this is the last deployment stage, also close the issue
            if (process.env.CLOSING_ENV && deployEnvironment === process.env.CLOSING_ENV) {
              await context.github.issues.update({
                repo: `${repositoryName}`,
                owner: `${repositoryOwnerLogin}`,
                issue_number: issueNumber,
                state: 'closed'
              })
            }
          }
        }
      }
    }
  })

  app.on('*', async context => {
    context.log({ event: context.event, action: context.payload.action })
  })
}

require('custom-env').env(true)
/**
 * This is the main entrypoint to the Probot app
 * @param {import('probot').Application} app
 */

const KANBAN_COLUMN_LABELS_SEPARATOR = '|'

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

            // this is the last deployment stage, close the issue
            const closingEnv = process.env.CLOSING_ENV

            if (closingEnv && deployEnvironment === closingEnv) {
              await context.github.issues.update({
                repo: `${repositoryName}`,
                owner: `${repositoryOwnerLogin}`,
                issue_number: issueNumber,
                state: 'closed'
              })
            }

            const kanbanColumns = process.env.KANBAN_COLUMN_LABELS
            // any other column label should be removed on each deployment
            if (kanbanColumns) {
              const kanbanLabels = kanbanColumns.split(KANBAN_COLUMN_LABELS_SEPARATOR)

              // get all the labels on the issue
              const { data: existentIssue } = await context.github.issues.get({
                repo: `${repositoryName}`,
                owner: `${repositoryOwnerLogin}`,
                issue_number: issueNumber
              })

              const { labels } = existentIssue

              // keep only the kanban labels on the issue
              if (labels) {
                const removableLabels = labels
                  .filter(label => kanbanLabels.includes(label.name) && deployEnvironment !== label.name)
                  .map(label => label.name)

                // remove all other kanban labels from the issue
                for (const previousLabel of removableLabels) {
                  await context.github.issues.removeLabel({
                    repo: `${repositoryName}`,
                    owner: `${repositoryOwnerLogin}`,
                    issue_number: issueNumber,
                    name: `${previousLabel}`
                  })
                }
              }
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

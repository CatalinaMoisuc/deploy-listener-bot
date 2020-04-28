/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!');

  app.on('issues.opened', async context => {
    const issueComment = context.issue({body: 'Thanks for opening this issue!'});
    return context.github.issues.createComment(issueComment)
  });

  app.on('deployment_status.created', async context => {

    const deployCommitSha = context.payload.deployment.sha;
    const deployEnvironment = context.payload.deployment.environment;

    const deployStatus = context.payload.deployment_status.state;
    console.log({deployStatus});


    if (deployStatus === 'success') {

      // compare previously deployed tag
      const comparison = await context.github.repos.compareCommits({
        base: `old-${deployEnvironment}`,
        head: `${deployCommitSha}`,
        repo: "deploy-bot",
        owner: "CatalinaMoisuc"
      });

      // get the commits between the old and the new deployed tag
      const {commits} = comparison.data;
      console.log({commits});

      //for each commit hash
      for (const commit of commits) {
        console.log(`Handling commit: ${commit.sha}`);

        const query = `${commit.sha}+repo:CatalinaMoisuc/deploy-bot`;
        console.log({query});

        // find all pull requests that contained this commit hash
        const {data} = await context.github.search.issuesAndPullRequests({
          q: query
        });

        const {items} = data;
        console.log({items});


        // for each pull request that contains a deployed commit hash
        items.forEach(pr => {
          const body = pr.body;
          const number = pr.number;

          console.log({body});
          console.log({number});

          // match all issue numbers mentioned in the description
          const matcher = new RegExp(`/#[0-9]+/g`);
          const issuesMentioned = body.match(/#[0-9]+/g);

          // and label each issue mentioned in the PRs description with the environment label
          issuesMentioned.forEach(issue => {
            context.github.issues.addLabels({
              repo: "deploy-bot",
              owner: "CatalinaMoisuc",
              issue_number: parseInt(issue.slice(1)),
              labels: [`${deployEnvironment}`]
            })
          });

          console.log({issuesMentioned});
        });
      }
    }

  });

  module.exports = app => {
    app.on('*', async context => {
      context.log({event: context.event, action: context.payload.action})
    })
  }

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};

function extract([beg, end]) {
  const matcher = new RegExp(`${beg}(.*?)${end}`, 'gm');
  const normalise = (str) => str.slice(beg.length, end.length * -1);
  return function (str) {
    return str.match(matcher).map(normalise);
  }
}

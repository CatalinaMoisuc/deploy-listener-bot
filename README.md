# deploy-listener-bot

> A GitHub App built with [Probot](https://github.com/probot/probot)
> that listens to deployments and labels your issues with the environment name in which the PR linked to the issue was
> merged and deployed.
> 
> The `deploy-listener-bot` will work as intended only if you:
> * open PRs and mention the issue number in the PR description
> * when deploying your app, make use of the github deployment and deployment status API, marking the commit sha that
> is currently being deployed
> * every time you deploy keep two tags `${env}-old` and `${env}` up to date, replacing `env` with the environment in
> which you are deploying so that the bot can use the tags to figure out all the commits deployed since last time
> * for each deployment environment that you have (`${env}`), make sure you have a label with the same name in github
>
> This bot is meant to be used with any Kanban board that matched issues with columns based on labels, so you can use
> any boards like: Github Projects, Codetree etc. and your issues would move to the right column every time you are
> deploying a batch of commits.
>

## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Contributing

If you have suggestions for how `deploy-listener-bot` could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2020 Catalina Moisuc <>

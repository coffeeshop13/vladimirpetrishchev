# Vladimir Petrishchev website

This repository contains the static deployment for [vladimirpetrishchev.com](https://vladimirpetrishchev.com/).

## Build locally

```sh
npm run build
```

## GitHub deployment

The build copies the imported homepage into `dist/`, then generates the `/blog/` index, article pages, `rss.xml`, and `sitemap.xml` from Markdown files in `content/posts/`.

The workflow in `.github/workflows/deploy.yml` publishes `dist/` to the
`vladimir-petrishchev` bucket in project `gen-lang-client-0935094515`.

The weekly blog workflow runs every Monday at 08:00 Europe/Berlin. It asks the OpenAI Responses API for a structured 800–1,200 word article, writes it to `content/posts/`, commits it to `main`, and lets the deployment workflow publish the updated site. Before the first scheduled run, add the repository Actions secret `OPENAI_API_KEY`.

GitHub must have these deployment secrets configured:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOY_SERVICE_ACCOUNT`

The bucket is dedicated to this website, so the deployment removes objects
that are no longer present in the build output.

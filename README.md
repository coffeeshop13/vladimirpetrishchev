# Vladimir Petrishchev website

This repository currently contains an imported reference copy of the deployed
static website in `reference-deployment/`. The build step copies that exact
deployment into `dist/` so the site can be published reproducibly before the
editable blog source is added.

## Build locally

```sh
npm run build
```

## GitHub deployment

The workflow in `.github/workflows/deploy.yml` publishes `dist/` to the
`vladimir-petrishchev` bucket in project `gen-lang-client-0935094515`.
GitHub must have these repository secrets configured:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOY_SERVICE_ACCOUNT`

The bucket is dedicated to this website, so the deployment removes objects
that are no longer present in the build output.

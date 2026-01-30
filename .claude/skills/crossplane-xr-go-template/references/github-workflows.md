# GitHub Actions Workflow Templates

XRD configurations use `unbounded-tech/workflows-crossplane` reusable workflows. Each config needs three workflow files.

## on-pr.yaml

Runs on pull requests - validates, tests, and publishes preview packages.

```yaml
name: on-pr

on:
  pull_request:
    branches:
      - main
    types:
      - labeled
      - opened
      - reopened
      - synchronize
    paths:
      - '.github/workflows/on-pr.yaml'
      - '.gitops/**'
      - 'apis/**'
      - 'examples/**'
      - 'tests/**'
      - 'functions/**'
      - 'upbound.yaml'

permissions:
  packages: write
  contents: write
  issues: write
  pull-requests: write
  id-token: write  # Required for OIDC auth

jobs:
  validate:
    uses: unbounded-tech/workflows-crossplane/.github/workflows/validate.yaml@v2.13.0
    with:
      examples: |
        [
          { "example": "examples/<plural>/minimal.yaml" },
          { "example": "examples/<plural>/standard.yaml", "observed_resources": "examples/test/mocks/observed-resources/standard/steps/1/" },
          { "example": "examples/<plural>/standard.yaml", "observed_resources": "examples/test/mocks/observed-resources/standard/steps/2/" }
        ]
      api_path: apis/<plural>
      error_on_missing_schemas: true

  test:
    uses: unbounded-tech/workflows-crossplane/.github/workflows/test.yaml@v2.13.0

  e2e:
    uses: unbounded-tech/workflows-crossplane/.github/workflows/e2e.yaml@v2.13.0
    secrets:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    with:
      aws: true
      aws-use-oidc: true
      aws-account-id: "<aws-account-id>"  # e.g., "034489662075"
      aws-region: us-east-2
      timeout-minutes: 30

  publish:
    needs:
      - validate
      - test
    uses: unbounded-tech/workflows-crossplane/.github/workflows/publish.yaml@v2.13.0
    secrets: inherit
    with:
      tag: pr-${{ github.event.pull_request.number }}-${{ github.sha }}
```

## on-push-main.yaml

Runs on merge to main - validates, tests, versions, and tags.

```yaml
name: on-push-main

on:
  push:
    branches:
      - main
    paths:
      - '.github/workflows/on-push-main.yaml'
      - '.github/workflows/on-version-tagged.yaml'
      - '.gitops/**'
      - 'apis/**'
      - 'examples/**'
      - 'functions/**'
      - 'tests/**'
      - 'upbound.yaml'

permissions:
  packages: write
  contents: write
  issues: write
  pull-requests: write
  id-token: write  # Required for OIDC auth

jobs:
  validate:
    uses: unbounded-tech/workflows-crossplane/.github/workflows/validate.yaml@v2.13.0
    with:
      examples: |
        [
          { "example": "examples/<plural>/minimal.yaml" },
          { "example": "examples/<plural>/standard.yaml", "observed_resources": "examples/test/mocks/observed-resources/standard/steps/1/" },
          { "example": "examples/<plural>/standard.yaml", "observed_resources": "examples/test/mocks/observed-resources/standard/steps/2/" }
        ]
      api_path: apis/<plural>
      error_on_missing_schemas: true

  test:
    uses: unbounded-tech/workflows-crossplane/.github/workflows/test.yaml@v2.13.0

  e2e:
    uses: unbounded-tech/workflows-crossplane/.github/workflows/e2e.yaml@v2.13.0
    secrets:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    with:
      aws: true
      aws-use-oidc: true
      aws-account-id: "<aws-account-id>"  # e.g., "034489662075"
      aws-region: us-east-2
      timeout-minutes: 30

  version-and-tag:
    name: Version and Tag
    needs:
      - validate
      - test
      - e2e
    uses: unbounded-tech/workflow-vnext-tag/.github/workflows/workflow.yaml@v1.21.0
    secrets:
      DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
    with:
      useDeployKey: true
      yqPatches: |
        patches:
          - filePath: .gitops/deploy/values.yaml
            selector: .version
            valuePrefix: "v"
          - filePath: .gitops/deploy/Chart.yaml
            selector: .version
            valuePrefix: ""
```

## E2E Job Configuration

### OIDC Authentication (Recommended)

Use OIDC-based authentication for E2E tests. This is more secure than static credentials as it uses short-lived tokens via GitHub's OIDC provider.

**Required parameters:**
- `aws-use-oidc: true` - Enable OIDC authentication
- `aws-account-id` - AWS account ID where the OIDC provider is configured
- `aws-region` - AWS region for the assume-role operation

**Required permissions:**
```yaml
permissions:
  id-token: write  # Required for OIDC token request
```

The secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are still passed but used as fallback only when OIDC is not available.

### Debug Resource Types (Optional)

For debugging E2E test issues, you can add the `debug-resource-types` parameter to output detailed information about specific resource types:

```yaml
  e2e:
    uses: unbounded-tech/workflows-crossplane/.github/workflows/e2e.yaml@v2.13.0
    with:
      aws: true
      aws-use-oidc: true
      aws-account-id: "<aws-account-id>"
      aws-region: us-east-2
      timeout-minutes: 30
      debug-resource-types: |
        [
          "networks.aws.platform.example.com",
          "vpcs.ec2.aws.m.upbound.io"
        ]
```

## Synchronization Requirements

**CRITICAL:** Keep the `examples` list in workflows synchronized with the `EXAMPLES` variable in the Makefile. When adding/removing examples, update all three locations:

1. `Makefile` - `EXAMPLES` variable
2. `.github/workflows/on-pr.yaml` - `examples` input
3. `.github/workflows/on-push-main.yaml` - `examples` input

Failure to sync causes CI to validate different examples than local `make validate:all`.

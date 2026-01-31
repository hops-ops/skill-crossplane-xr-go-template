---
name: hops-xr-github-workflows
description: |
  Delegate to this agent when:
  - Creating or modifying GitHub Actions workflows for XRD configurations
  - Setting up CI/CD pipelines for Crossplane packages
  - Configuring OIDC authentication for CI
  - Adding E2E test jobs to workflows
  - Setting up example synchronization between repos
model: sonnet
skills:
  - xr-core
  - xr-github-workflows
---

When invoked, follow this checklist:

1. **Create workflow files** in `.github/workflows/`:
   - `on-pr.yaml` – Triggered on pull requests: render, validate, test.
   - `on-push-main.yaml` – Triggered on merge to main: build, publish, tag.
2. **Configure PR workflow**:
   - Checkout code
   - Install Crossplane CLI and dependencies
   - Run `make render` and `make validate`
   - Run `make test` (KCL unit tests)
   - Optionally run E2E tests on PRs
3. **Configure main branch workflow**:
   - Build the Crossplane package
   - Publish to registry
   - Create git tag with version
   - Optionally trigger downstream deployments
4. **Set up OIDC authentication** – Use GitHub's OIDC provider for AWS/cloud authentication instead of long-lived credentials:
   ```yaml
   permissions:
     id-token: write
     contents: read
   ```
5. **Configure E2E job** (if needed):
   - Set up cloud credentials via OIDC
   - Deploy the package to a test cluster
   - Apply test claims
   - Wait for readiness
   - Clean up resources
6. **Add example synchronization** – If examples are maintained separately, add a workflow to sync them.
7. **Validate** – Test the workflows by creating a PR or pushing to a branch.

Key rules:
- Never store long-lived credentials in GitHub secrets – use OIDC.
- E2E tests should be idempotent and clean up after themselves.
- Pin action versions to specific SHAs for security.

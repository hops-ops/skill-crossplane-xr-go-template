# Scaffold a New XRD Configuration

Walk the user through creating a complete XRD configuration from scratch.

## Step 1: Gather Requirements

Ask the user:
1. **What cloud resources** does this XRD manage? (e.g., VPC + Subnets, S3 bucket, EKS cluster)
2. **XRD kind name** — what should the CRD be called? (e.g., `Network`, `CertManager`, `ObjectStorage`)
3. **API group** — confirm or customize (default: `platform.example.com`)
4. **Providers needed** — AWS, Kubernetes, Helm, or a combination?
5. **Is this Helm-only?** — If yes, use `hops-xr-got-helm-pattern` agent as the entry point instead.

## Step 2: Execute Workflow Phases

Follow the phases from the orchestrator skill, delegating to each agent in order:

### Phase 1: Schema & Structure
1. Delegate to **`hops-xr-got-template-structure`** — Create directory layout, XRD definition, composition, and template files.
2. Delegate to **`hops-xr-got-observed-state`** — Set up state-init and state-compute with $state namespace.
3. Delegate to **`hops-xr-got-template-patterns`** — Apply the relevant patterns for the resources being managed.

### Phase 2: Cross-Cutting Concerns
4. Delegate to **`hops-xr-labels`** — Add labels/tags to schema and all resource templates.
5. Delegate to **`hops-xr-got-status-output`** — Design status fields based on what observed values to expose.
6. Delegate to **`hops-xr-external-names`** — Add import support for each managed resource.
7. Delegate to **`hops-xr-usages`** — Add deletion protection for parent-child relationships.

### Phase 3: Refinement
8. Delegate to **`hops-xr-got-template-simplification`** — Review and simplify the generated templates.

### Phase 4: Testing
9. Delegate to **`hops-xr-observed-resources`** — Create test mock files for observed resources.
10. Delegate to **`hops-xr-testing`** — Write KCL unit tests and set up E2E test infrastructure.

### Phase 5: Build & CI
11. Delegate to **`hops-xr-makefile`** — Create Makefile with all required targets.
12. Delegate to **`hops-xr-github-workflows`** — Set up CI workflows.
13. Delegate to **`hops-xr-renovate`** — Configure dependency automation.

### Phase 6: Packaging & Docs
14. Delegate to **`hops-xr-gitops-package`** — Create the `.gitops/deploy/` Helm chart.
15. Delegate to **`hops-xr-readme`** — Write the README.

## Step 3: Final Validation

After all phases:
1. Run `make render:all` and `make validate:all`
2. Run `make test`
3. Run `/hops-xr-checklist` to confirm completeness
4. Report any remaining items to the user

## Alternative: Helm-Only

If the user indicated this is a Helm-only XRD, delegate to **`hops-xr-got-helm-pattern`** first, which replaces Phases 1-2 with simpler patterns, then continue from Phase 2 step 4 onward.

---
name: crossplane-xr-go-template
description: |
  This skill provides guidance for authoring Crossplane Composite Resource (XR) configurations
  using Go templates (function-go-templating). It should be used when working on or building
  Crossplane configurations. The skill covers XRD schema design, Go templating patterns,
  provider configuration, testing with observed resources, and CI/CD workflows.
---

# The most important rules

This skill is a collection of references of patterns that are required to author a Composite Resource and it's Definition (XR and XRD). These should be treated as our coding standards. Every time you are working in a project that is a Crossplane XR/XRD, it is imperative to:

1. Reread the skill if when a coversation is compacted
2. Every situation you encounter should already be documented in references - this file is largely an index to help you find the reference you need. Everytime you make a change you should
  a. Identify which references are related to the change
  b. Does this change follow the patterns/standards in that reference?
3. When you believe a task is complete review the "XRD Authoring Completion Checklist".
  a. if you are working on a change related to certain references, evaulate the checklist for those topics - iterate until those items are complete
  b. note what is or is not completed outside of your scope of changes in the overall checklist

Say out loud each time you do one of these things

# Vibes

> "Any intelligent fool can make things bigger and more complex. It takes a touch of genius—and a lot of courage—to move in the opposite direction."

Less is more. Human readability wins.

# Customization

This skill uses example values throughout. Replace these with your own:

| Placeholder | Example Used | Replace With |
|---|---|---|
| API group domain | `platform.example.com` | Your XRD API group (e.g., `infra.mycompany.io`) |
| Label prefix | `platform.example.com/` | Same as your API group domain |
| Container registry | `ghcr.io/<your-org>/` | Your OCI registry path |
| GitHub org | `<your-org>` | Your GitHub organization |
| KCL model import | `com.example.platform` | Reversed API group domain |

# Crossplane XRD Configurations

Each configuration is a self-contained repo with `.git`, CI, and packaging.

**Standard layout:**
- `apis/` - XRD definitions, compositions, configuration metadata
- `examples/` - Example claims and test mocks
- `functions/` - Go template files for rendering
- `tests/` - KCL unit tests and E2E test definitions
- `.github/` - CI workflows (on-pr.yaml, on-push-main.yaml)
- `.gitops/` - Helm chart for GitOps deployment
- `_output/` - Build artifacts (gitignored)
- `.up/` - Generated models from `up project generate` (gitignored)

When scaffolding a new config, pick the closest reference, then update values/metadata/docs without changing the folder contract. `.github/` and `.gitops/` should stay structurally identical across repos.

## Reference Documentation

Read these references based on your current task:

| Reference | When to Use |
|-----------|-------------|
| `references/helm-xrd-pattern.md` | **Helm-only XRDs** - flat schema, inline defaults, lightweight templates |
| `references/template-structure.md` | Setting up a new XRD's template files, understanding the reconciliation loop, file naming conventions, $state namespace |
| `references/observed-state-pattern.md` | Extracting values from observed resources, building the $observed/$state pattern |
| `references/template-patterns.md` | Implementing forProvider pass-through, Kubernetes Object resources, multi-provider setups |
| `references/template-simplification.md` | Refactoring complex templates, reducing duplication |
| `references/status-output.md` | Designing XRD status output, deciding what fields to expose |
| `references/labels-pattern.md` | Adding labels and tags to XRD schema, applying to Kubernetes and AWS resources, collection-specific patterns |
| `references/external-names.md` | Supporting resource import, E2E test persistence, external name formats |
| `references/usages.md` | Adding deletion protection, Usage naming conventions, dynamic list handling |
| `references/gitops-package.md` | Setting up `.gitops/` folder, deployment modes |
| `references/observed-resources.md` | Creating test mocks, verifying atProvider fields |
| `references/testing.md` | Writing KCL tests, E2E test setup, test philosophy |
| `references/makefile-template.md` | Makefile targets and structure |
| `references/github-workflows.md` | CI workflow configuration |
| `references/renovate-config.md` | Dependency update automation |
| `references/readme-structure.md` | README documentation structure |

## Standard .gitignore

Every configuration must have a `.gitignore` with these entries:

```gitignore
# Build output
_output/
.up/

# Virtual environments
.venv/

# Temporary files
.tmp/

# E2E test credentials (never commit secrets)
**/aws-creds
tests/**/secrets/
```

## Package Configuration

Each configuration requires two files declaring dependencies:

**`upbound.yaml`** - Project manifest for `up` CLI tooling:

```yaml
apiVersion: meta.dev.upbound.io/v2alpha1
kind: Project
metadata:
  name: <name>
spec:
  dependsOn:
  - apiVersion: pkg.crossplane.io/v1
    kind: Function
    package: xpkg.crossplane.io/crossplane-contrib/function-auto-ready
    version: '>=v0.6.0'
  - apiVersion: pkg.crossplane.io/v1
    kind: Provider
    package: xpkg.crossplane.io/crossplane-contrib/provider-aws-ec2
    version: '>=v2.3.0'
  description: Short description of what this XRD provides.
  license: Apache-2.0
  maintainer: Your Name <email@example.com>
  readme: |
    # <name>
    Brief explanation of the configuration's purpose.
  repository: ghcr.io/<your-org>/<name>
  source: github.com/<your-org>/<name>
```

**`apis/<plural>/configuration.yaml`** - Crossplane package metadata:

```yaml
apiVersion: meta.pkg.crossplane.io/v1alpha1
kind: Configuration
metadata:
  name: <name>
  annotations:
    meta.crossplane.io/maintainer: Your Name
    meta.crossplane.io/source: github.com/<your-org>/<name>
    meta.crossplane.io/description: Short description of the configuration.
spec:
  dependsOn:
  - provider: xpkg.crossplane.io/crossplane-contrib/provider-aws-ec2
    version: ">=v2.3.0"
  - function: xpkg.crossplane.io/crossplane-contrib/function-auto-ready
    version: ">=v0.6.0"
```

Both files declare the same dependencies but with different syntax. Keep versions in sync. The `function-auto-ready` dependency is required for all configurations using go-templating.

## README Documentation

Each configuration must have a README.md structured as a journey with stages: Getting Started → Growing → Enterprise Scale → Import Existing.

For README structure template and research guidance, read `references/readme-structure.md`.

## Configuration Schema Pattern

```yaml
apiVersion: platform.example.com/v1alpha1
kind: CertManager
metadata:
  name: cert-manager
  namespace: example-env
spec:
  clusterName: my-cluster

  # Labels applied to all Kubernetes resources (merged with defaults)
  labels:
    team: platform
    environment: production

  # Tags applied to all AWS resources (merged with defaults, same default values as labels)
  tags:
    CostCenter: engineering
    Project: my-project

  # Single provider: use providerConfigRef
  providerConfigRef:
    name: my-provider-config
    kind: ProviderConfig  # Always include kind

  # Multiple providers: use providerConfigRefs
  providerConfigRefs:
    aws:
      name: aws-provider-config
      kind: ProviderConfig
    kubernetes:
      name: k8s-provider-config
      kind: ProviderConfig

  helm:
    certManager:
      values: {}           # merges with defaults
      overrideAllValues: {} # replaces all defaults
  aws:
    enabled: true
    config:
      accountId: "123456789012"
      hostedZone: example.com
      region: us-east-1
```

**Key patterns:**
- Single provider: use `providerConfigRef` with `name` and `kind`
- Multiple providers: use `providerConfigRefs` with nested objects per provider
- Top-level keys by integration (`aws`, `gcp`) for provider-specific `config`
- Optional features expose `enabled` boolean
- Helm `values` merges with template defaults; `overrideAllValues` replaces all defaults
- Helm values use `x-kubernetes-preserve-unknown-fields: true` for pass-through
- Managed resources use `forProvider` pass-through for full override capability
- `labels` at spec root - applied to all Kubernetes resources, merged with defaults
- `tags` at spec root - applied to all AWS resources, same defaults as labels

## Template Structure

Templates run in a reconciliation loop with desired state (XR spec) and observed state (`$.observed.resources`). All `.gotmpl` files merge into one template—numeric prefixes are for human organization only.

For detailed template structure, file naming, $state namespace, and code examples, read `references/template-structure.md`.

For the $observed/$state namespace pattern, read `references/observed-state-pattern.md`.

For advanced patterns (forProvider pass-through, Kubernetes Object, multi-provider), read `references/template-patterns.md`.

## Key Conventions

- **Always apply labels from state** - Every resource must include `labels: {{ $state.<xrd>.labels | toJson }}` (see `references/labels-pattern.md`)
- `clusterName` is special—used as fallback default for `providerConfigRef.name`
- Set `fullnameOverride`/`nameOverride` to simple chart name
- Keep chart name/repository/version literal for Renovate detection
- Use IRSA/PodIdentity XRDs instead of raw Role/Policy/Attachment resources
- Default AWS tags mirror default labels: `platform.example.com/managed: "true"` + `platform.example.com/<kind>: <name>`, merged with user-provided tags
- Avoid redundant type suffixes in resource names (kind already tells you what it is)
- Example files don't need `example-` prefixes

## Crossplane 2.0 Requirements

- `XFooBar` → `FooBar` (no X prefix), `apis/xfoobars` → `apis/foobars`
- `spec.scope: Namespaced`, `metadata.name` follows `<plural>.<group>`
- Add `spec.managementPolicies` (default `["*"]`)

**Use `.m.` API versions for all managed resources:**

```yaml
# CORRECT - namespaced API
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: VPC

# WRONG - cluster-scoped API
apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
```

**Always include `kind` in `providerConfigRef`:**

```yaml
spec:
  providerConfigRef:
    name: {{ $providerConfigName }}
    kind: {{ $providerConfigKind }}
```

## Rendering & Validation

```bash
make render:all     # render all examples (matches CI)
make validate:all   # validate all examples (matches CI)
make render         # alias for render:all
make validate       # alias for validate:all
make test           # run KCL render tests
make e2e            # run E2E tests
```

Keep examples in sync across: `Makefile` EXAMPLES variable, `.github/workflows/on-pr.yaml`, and `on-push-main.yaml`.

For full Makefile template, read `references/makefile-template.md`.

## Testing

Tests under `tests/` use KCL, run with `up test run tests/*`. E2E tests go in `tests/e2etest-<xrd>/`.

For full testing details (KCL patterns, E2E setup, test philosophy), read `references/testing.md`.

For creating observed resources for testing, read `references/observed-resources.md`.

## Using PodIdentity XRD (Preferred)

When giving a pod AWS access, prefer PodIdentity over IRSA:

```yaml
{{ if and $awsEnabled $awsPodIdentityEnabled }}
---
apiVersion: aws.platform.upbound.io/v2alpha1
kind: PodIdentity
metadata:
  name: {{ $clusterName }}-cert-manager-pod-identity
  annotations:
    {{ setResourceNameAnnotation "pod-identity" }}
spec:
  parameters:
    clusterName: {{ $clusterName }}
    providerConfigRef:
      name: {{ $awsProviderConfigName }}
      kind: {{ $awsProviderConfigKind }}
    region: {{ $awsRegion }}
    inlinePolicy:
      - name: default
        policy: |
          { ... }
    serviceAccount:
      namespace: cert-manager
      name: cert-manager
{{ end }}
```

## Status Output Design

Status should expose observed values from cloud resources (ARNs, IDs, names), not echo back inputs. Use typed fields that serve as an anti-corruption layer against provider schema changes.

For detailed guidance on status design, examples of good/bad patterns, and XRD schema definitions, read `references/status-output.md`.

## Labels and Tags Pattern

XRDs should include both a `labels` field (for Kubernetes resources) and a `tags` field (for AWS resources). Both use identical default values:
- `platform.example.com/managed: "true"` - Identifies platform-managed resources
- `platform.example.com/<kind>: <name>` - Links resources to their XRD instance

**AWS Name tag:** All AWS resources must include a `Name` tag matching their Crossplane resource name. AWS Console displays this tag as the resource name (AWS resources only have IDs like `vpc-abc123`, not native names).

User-provided labels/tags merge with defaults (user values take precedence).

For XRD schema definition, state-init patterns, and collection-specific examples, read `references/labels-pattern.md`.

## External Names for Resource Import

XRDs should support importing existing cloud resources via the `crossplane.io/external-name` annotation for adopting existing infrastructure and E2E test persistence.

For schema patterns, template examples, and external name formats, read `references/external-names.md`.

## GitOps Deployment Package

Each configuration must have a `.gitops/deploy/` folder with a Helm chart for GitOps deployment. Supports two modes: default (Crossplane resolves dependencies) and platform (functions managed separately).

For full structure and templates, read `references/gitops-package.md`.

## Usages for Deletion Protection

Every XRD must have Usage resources protecting parent-child relationships. Without Usages, resources can be deleted in wrong order, causing orphaned resources and failed deletions.

**Key points:**
- Place Usages alongside the resources they protect (not in separate file)
- Name pattern: `<name>-delete-<child>-before-<parent>`
- Gate on readiness of both parent and child
- Use deterministic identifiers for dynamic lists (NOT array indices)

For patterns, examples, and common relationships, read `references/usages.md`.

## GitHub Actions & Renovate

For workflow templates, read `references/github-workflows.md`.
For Renovate configuration, read `references/renovate-config.md`.

## XRD Authoring Completion Checklist

Before considering an XRD configuration complete, verify all items:

### Reference Documentation Review
- [ ] `references/template-structure.md` - Template files follow naming conventions, $state namespace pattern
- [ ] `references/observed-state-pattern.md` - Followed $observed/$state namespace pattern
- [ ] `references/template-patterns.md` - Applied relevant patterns (forProvider pass-through, multi-provider, etc.)
- [ ] `references/template-simplification.md` - Templates are simplified and readable
- [ ] `references/observed-resources.md` - Test mocks use correct atProvider fields from provider API docs
- [ ] `references/testing.md` - Tests follow unit test philosophy (test YOUR API, not provider's), use inline fixtures, KCL patterns applied
- [ ] `references/makefile-template.md` - Makefile has all required targets
- [ ] `references/github-workflows.md` - CI workflows configured correctly (validate, test, e2e, publish jobs)
- [ ] `references/renovate-config.md` - Renovate configured for dependency updates
- [ ] `references/readme-structure.md` - README follows journey structure

### GitOps Deployment Package
- [ ] `.gitops/deploy/Chart.yaml` exists with correct name and description
- [ ] `.gitops/deploy/values.yaml` exists with `version: latest` and `skipDependencyResolution: false` (default)
- [ ] `.gitops/deploy/templates/config.yaml` renders Configuration always, Function only when `skipDependencyResolution=true`
- [ ] Package names match the configuration name (e.g., `aws-ipam`)
- [ ] GHCR package URLs use correct org and naming convention

### Usages (Deletion Protection)
- [ ] **All parent-child resource relationships have Usage resources** (mandatory - prevents orphaned resources and deletion failures)
- [ ] Usages are gated on both parent and child being Ready
- [ ] Usage naming follows convention: `<name>-delete-<child>-before-<parent>` (describes safe deletion order)
- [ ] Dynamic Usages use **deterministic identifiers** (resourceName, slugified input), NOT array indices
- [ ] Usage annotations use `setResourceNameAnnotation` for proper tracking
- [ ] `replayDeletion: true` used where cascading deletes are desired

### CI Workflows
- [ ] `.github/workflows/on-pr.yaml` exists with validate, test, e2e, and publish jobs
- [ ] `.github/workflows/on-push-main.yaml` exists with validate, test, e2e, and version-and-tag jobs
- [ ] `.github/workflows/on-version-tagged.yaml` exists for release publishing
- [ ] E2E job uses OIDC auth (`aws-use-oidc: true`, `aws-account-id`, `aws-region`)
- [ ] `id-token: write` permission added for OIDC auth

### Validation & Testing
- [ ] `make render:all` - All examples render without errors
- [ ] `make validate:all` - All examples pass schema validation, and variations of rendering examples and their observed resources are in the Makefile EXAMPLES list
- [ ] `make test` - Unit tests pass (KCL render tests)
- [ ] E2E test claim matches XRD spec - Verify `tests/e2etest-*/main.k` uses correct API fields per `apis/<plural>/definition.yaml`

### API & Schema Verification
- [ ] All observed template fields verified against Upbound Marketplace atProvider schemas
- [ ] XRD spec fields match what templates actually use
- [ ] Status output fields are documented in XRD definition
- [ ] Provider versions in `upbound.yaml` and `apis/<plural>/configuration.yaml` are in sync

### Status Output Design
- [ ] Status contains only observed values from cloud resources (ARNs, IDs, names)
- [ ] Status does NOT echo back user inputs (user already knows what they provided)
- [ ] Status uses typed fields (not untyped atProvider pass-through)
- [ ] Each status field serves integrations: "Would another XRD need this value?"
- [ ] Status serves as anti-corruption layer against provider schema changes

### External Names (Resource Import)
- [ ] Each importable resource type has `externalName` field in XRD spec
- [ ] State-init captures external names from spec
- [ ] Computed state includes external names in resource slices
- [ ] Resource templates conditionally add `crossplane.io/external-name` annotation
- [ ] E2E test supports both ephemeral and persistent (import) test modes
- [ ] E2E test documents how to get external names after first run
- [ ] Import example exists showing `managementPolicies` without Delete + external names

### Resource Labels and Tags
- [ ] XRD spec includes `labels` field with `x-kubernetes-preserve-unknown-fields: true`
- [ ] XRD spec includes `tags` field with `x-kubernetes-preserve-unknown-fields: true`
- [ ] State-init computes identical defaults for both labels and tags (`<api-group>/managed: "true"` + `<api-group>/<kind>: <name>`)
- [ ] Core computed state includes `labels` and `tags` from effective spec
- [ ] All Kubernetes resources apply labels via `labels: {{ $state.<xrd>.labels | toJson }}`
- [ ] All AWS resources apply tags via `tags: {{ $state.<xrd>.tags | toJson }}` in `spec.forProvider`
- [ ] **All AWS resources include a `Name` tag** matching their Crossplane resource name (AWS Console displays this)
- [ ] Default labels/tags merge with user-provided values (user values take precedence)
- [ ] Iterated resources include resource-specific labels/tags merged with base values

### Files Sync Check
- [ ] `EXAMPLES` variable in Makefile matches `.github/workflows/on-pr.yaml` and `on-push-main.yaml`
- [ ] Dependencies in `upbound.yaml` match `apis/<plural>/configuration.yaml`

### Project Files
- [ ] `.gitignore` includes `_output/`, `.up/`, `.venv/`, `.tmp/`
- [ ] `.gitignore` includes `**/aws-creds` and `tests/**/secrets/` (E2E credentials)
- [ ] `renovate.json` exists with correct config (see `references/renovate-config.md`)

Run this checklist by reading each reference file and confirming the patterns are applied correctly in your configuration.

## External Documentation

**Go Templating Functions:**
- https://github.com/crossplane-contrib/function-go-templating
- NOTE: Do not include `function-go-templating` in `upbound.yaml` - the `up build` tooling uses it under the hood automatically.

**Provider Documentation:**
- Upbound Marketplace for provider APIs: https://marketplace.upbound.io/
- AWS provider family (use this for crossplane-contrib-provider-aws): https://marketplace.upbound.io/providers/upbound/provider-family-aws/

**Looking Up Managed Resource Schemas:**

When authoring observed templates or creating test mocks, verify atProvider fields exist:

1. Find the provider package in `upbound.yaml` (e.g., `provider-aws-ec2`)
2. Look up the resource at: `https://marketplace.upbound.io/providers/<org>/<provider>/<version>/resources/<group>/<Kind>/<apiVersion>`
3. Scroll to the `status.atProvider` section to see available fields

Note, for provider-aws, even though the org is "crossplane-contrib" the docs for these are at "upbound"

Example URLs:
- VPC: `https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/v2.3.0/resources/ec2.aws.upbound.io/VPC/v1beta1`
- Subnet: `https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/v2.3.0/resources/ec2.aws.upbound.io/Subnet/v1beta1`
- IAM Role: `https://marketplace.upbound.io/providers/upbound/provider-aws-iam/v2.3.0/resources/iam.aws.upbound.io/Role/v1beta1`

**Common Provider Packages:**
- `provider-aws-ec2` - VPC, Subnet, SecurityGroup, NATGateway, InternetGateway, RouteTable, EIP, FlowLog
- `provider-aws-iam` - Role, Policy, RolePolicyAttachment, InstanceProfile
- `provider-aws-eks` - Cluster, NodeGroup, Addon, IdentityProviderConfig
- `provider-aws-s3` - Bucket, BucketPolicy, BucketPublicAccessBlock
- `provider-aws-route53` - Zone, Record, HealthCheck

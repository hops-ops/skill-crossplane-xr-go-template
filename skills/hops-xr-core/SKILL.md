---
name: hops-xr-core
description: |
  Core foundational knowledge for Crossplane XRD authoring with Go templates.
  Includes standard layout, conventions, Crossplane 2.0 requirements, rendering
  commands, package configuration, and external documentation links. Every
  specialist agent loads this skill as a baseline.
---

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

## Key Conventions

- **Always apply labels from state** - Every resource must include `labels: {{ $state.<xrd>.labels | toJson }}`
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

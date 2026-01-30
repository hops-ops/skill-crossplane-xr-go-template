# Usages for Deletion Protection

Every XRD must have Usage resources protecting parent-child relationships. Without Usages, resources can be deleted in the wrong order, causing orphaned cloud resources, failed deletions, and data loss.

Crossplane Usages (`protection.crossplane.io/v1beta1`) prevent accidental deletion of resources that have dependents.

## Placement

Place Usages alongside the resources they protect, NOT in a separate usages file.

Each resource file should contain the Usage resources that protect the resources defined in that file. This keeps the protection logic co-located with the resources it applies to, making it easier to understand and maintain.

## Naming Convention

Use `<name>-delete-<by>-before-<of>` to describe what must happen for safe deletion. This matches the Usage spec fields (`by:` and `of:`) and makes the deletion order explicit.

- `by:` - the using/dependent resource (deleted first)
- `of:` - the protected resource (deleted after)

## Pattern

```yaml
{{- /* Resource definition */}}
{{- if $state.network.vpc.render }}
---
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: VPC
metadata:
  name: {{ $state.network.name }}
  annotations:
    {{ setResourceNameAnnotation "vpc" }}
...
{{- end }}

{{- /* Usage protecting the VPC - placed in same file as VPC */}}
{{- if and $state.observed.vpc.ready $state.observed.subnet.ready }}
---
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  name: {{ $name }}-delete-subnet-before-vpc
  annotations:
    {{ setResourceNameAnnotation "usage-vpc-subnet" }}
spec:
  of:
    apiVersion: ec2.aws.m.upbound.io/v1beta1
    kind: VPC
    resourceRef:
      name: {{ $vpcName }}
  by:
    apiVersion: ec2.aws.m.upbound.io/v1beta1
    kind: Subnet
    resourceRef:
      name: {{ $subnetName }}
{{- end }}
```

## Key Principles

- **Co-locate Usages with resources** - place Usages in the same file as the resources they protect
- `of:` specifies the protected resource (parent/dependency)
- `by:` specifies the resource that depends on it (child)
- **Gate on readiness** - only render Usage when both resources are Ready
- Use `replayDeletion: true` when you want deletion of the protected resource to trigger deletion of dependent resources

## Why Gate Usages on Readiness

If a Usage is created before the resources it protects are Ready, and those resources never become Ready (e.g., due to misconfiguration or transient errors), the Usage can get stuck during deletion. This causes cleanup to hang indefinitely, blocking scenarios like E2E tests. By waiting for both resources to be Ready before creating the Usage, we ensure the protection relationship is only established for resources that are actually functioning.

## Common Usage Relationships

- VPC protects: Subnets, InternetGateway, NAT Gateway, Route Tables, Transit Gateway Attachments
- Subnet protects: NAT Gateway, EKS Node Groups
- Organization protects: Organizational Units
- Organizational Unit protects: Accounts, Child OUs
- PermissionSet protects: AccountAssignments, PolicyAttachments
- IAM Role protects: RolePolicyAttachments

## Example from aws-network (VPC protects Subnet)

```yaml
{{- $subnetObs := get $state.observed.subnets $subnet.resourceName | default dict }}
{{- if and $state.observed.vpc.ready $subnetObs.ready }}
---
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  name: {{ $state.network.name }}-delete-{{ $subnet.resourceName }}-before-vpc
  annotations:
    {{ setResourceNameAnnotation (printf "usage-vpc-%s" $subnet.resourceName) }}
spec:
  of:
    apiVersion: ec2.aws.m.upbound.io/v1beta1
    kind: VPC
    resourceRef:
      name: {{ $state.network.name }}
  by:
    apiVersion: ec2.aws.m.upbound.io/v1beta1
    kind: Subnet
    resourceRef:
      name: {{ $subnet.name }}
{{- end }}
```

## Deterministic Naming for Dynamic Lists

When creating Usages dynamically from a list of resources, ensure names are unique using **deterministic values from the resource itself**, NOT array indices.

**Why this matters:** Array indices are positional—if someone reorders a list or removes an item, indices shift. This causes Usages to be deleted and recreated with different names, breaking protection during the transition.

### BAD - Using Array Index

```yaml
{{- range $i, $account := $state.org.accounts }}
---
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  # WRONG: Index changes if list is reordered
  name: {{ $state.org.name }}-delete-account-{{ $i }}-before-ou
{{- end }}
```

### GOOD - Using Deterministic Identifier

```yaml
{{- range $account := $state.org.accounts }}
---
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  # CORRECT: Uses account's own identifier, stable across list changes
  name: {{ $state.org.name }}-delete-{{ $account.resourceName }}-before-ou
{{- end }}
```

### Good Identifiers for Dynamic Lists

- `resourceName` - the resource's Kubernetes name (e.g., `subnet-public-1a`)
- Slugified user input - `$user.userName | lower | replace " " "-"`
- AWS identifiers - account ID, zone name, CIDR block slug
- Composite keys - `{{ $ou.name }}-{{ $account.name }}`

### Avoid

- Array indices (`$i`, `$index`)
- Random/generated values
- Timestamps or counters

## When to Use replayDeletion

**Default: `false`** - blocked deletions wait for Kubernetes exponential backoff (can take minutes).

**Set `replayDeletion: true`** to immediately retry deletion when the blocking resource is removed:

```yaml
spec:
  replayDeletion: true
  of:
    apiVersion: aws.platform.example.com/v1alpha1
    kind: PodIdentity
    resourceRef:
      name: {{ $state.name }}-pod-identity
  by:
    apiVersion: helm.platform.example.com/v1alpha1
    kind: CertManager
    resourceRef:
      name: {{ $state.name }}
```

**Recommended:** Always set `replayDeletion: true` to avoid slow deletion cleanup.

## compositeDeletePolicy for XR Deletion Ordering

When an XRD composes other XRs (not just managed resources), use `Foreground` deletion policy to ensure Usages work correctly.

**Default behavior (`Background`):**
- XR deletes immediately from API server
- Composed resources garbage-collected asynchronously
- Usages are ineffective because XR vanishes before children can block deletion

**With `Foreground`:**
- Adds finalizer to XR
- Deletes children first, respecting Usage ordering
- Waits for children to fully terminate
- Only then removes the XR

### Where to Set It

**Option 1: On the XRD (recommended for consistent default)**

```yaml
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: certmanagers.helm.aws.platform.example.com
spec:
  group: helm.aws.platform.example.com
  names:
    kind: CertManager
    plural: certmanagers
  defaultCompositeDeletePolicy: Foreground  # Default for all XRs from this XRD
  # ...
```

**Option 2: On the Composition**

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: certmanagers.helm.aws.platform.example.com
spec:
  compositeTypeRef:
    apiVersion: helm.aws.platform.example.com/v1alpha1
    kind: CertManager
  compositeDeletePolicy: Foreground
  mode: Pipeline
  # ...
```

### When Required

- **Always** for wrapper XRDs that compose other XRDs
- Any XRD using Usages where `by:` references an XR (not a managed resource)
- Hierarchical compositions (App XR → DB XR → Network XR)

### Trade-offs

| Foreground | Background |
|------------|------------|
| Reliable deletion ordering | Faster deletions |
| Usages respected | May bypass protections |
| Can hang if child fails to delete | Fire-and-forget |
| Better for production | Fine for simple/ephemeral XRs |

**Recommendation:** Default to `Foreground` for XRDs involving Usages or hierarchies. The reliability is worth the slight performance cost.

## Namespaced XRs and Scope Constraints (Crossplane 2.x)

In Crossplane 2.x, XRDs default to `Namespaced` scope. This has implications for what resources can be composed:

**Rule:** Namespaced XRs should only compose **namespaced** resources.

Composing cluster-scoped resources from a namespaced XR will create them, but without owner references. This breaks garbage collection—those resources won't be deleted when the XR is deleted.

### Checking Your Composed Resources

Ensure all XRDs you compose are also namespaced:
- ✓ `helm.platform.example.com/CertManager` - namespaced
- ✓ `aws.platform.example.com/PodIdentity` - namespaced
- ✗ Cluster-scoped resources - avoid from namespaced XRs

## Reference Implementations

- `aws-network/functions/render/50-subnets.yaml.gotmpl` - VPC/Subnet relationships
- `aws-organization/functions/render/200-organizational-units.yaml.gotmpl` - OU/Account hierarchies
- `aws-identity-center/functions/render/300-permission-sets.yaml.gotmpl` - PermissionSet protection
- `helm/_wrappers/aws/cert-manager/` - XR-to-XR usages with `compositeDeletePolicy: Foreground`

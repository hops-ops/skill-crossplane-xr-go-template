# Labels and Tags Pattern

XRDs should include both a `labels` field (for Kubernetes resources) and a `tags` field (for AWS resources) at the spec root. Both use the same default values for consistency and traceability.

## XRD Schema Definition

Add both fields to `apis/<plural>/definition.yaml`:

```yaml
# In apis/<plural>/definition.yaml
spec:
  type: object
  properties:
    labels:
      type: object
      description: Custom labels applied to all Kubernetes resources. Merged with default labels (platform.example.com/managed, platform.example.com/<kind>).
      additionalProperties:
        type: string
      x-kubernetes-preserve-unknown-fields: true
    tags:
      type: object
      description: Custom tags applied to all AWS resources. Merged with default tags (platform.example.com/managed, platform.example.com/<kind>).
      additionalProperties:
        type: string
      x-kubernetes-preserve-unknown-fields: true
```

## Default Values

Both labels (Kubernetes) and tags (AWS) use the same defaults, computed in state-init:
- `platform.example.com/managed: "true"` - Identifies platform-managed resources
- `platform.example.com/<kind>: <name>` - Links resources to their XRD instance (e.g., `platform.example.com/network: my-vpc`)

User-provided values take precedence over defaults when there are conflicts.

## State-Init Example

```yaml
{{- $xr := getCompositeResource . }}
{{- $spec := $xr.spec }}
{{- $name := $xr.metadata.name }}

{{- /* Default labels and tags use identical values */}}
{{- $defaults := dict
  "platform.example.com/managed" "true"
  (printf "platform.example.com/%s" (lower $xr.kind)) $name
}}

{{- $state := dict
  "spec" (dict
    "effective" (dict
      "labels" (merge (dict) $defaults ($spec.labels | default dict))
      "tags" (merge (dict) $defaults ($spec.tags | default dict))
    )
  )
}}
```

## Applying Labels to Kubernetes Resources

Every Kubernetes resource must include labels from state:

```yaml
metadata:
  name: {{ $state.network.name }}
  labels: {{ $state.network.labels | toJson }}
```

## Applying Tags to AWS Resources

Every AWS managed resource must include tags from state. **Always include a `Name` tag** - AWS Console uses this tag to display human-readable names for resources (AWS resources don't have a native name field, only IDs like `vpc-abc123`).

```yaml
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: VPC
metadata:
  name: {{ $state.network.vpc.name }}
  labels: {{ $state.network.labels | toJson }}
spec:
  forProvider:
    cidrBlock: {{ $state.network.vpc.cidrBlock }}
    tags: {{ merge (dict "Name" $state.network.vpc.name) $state.network.tags | toJson }}
```

The `Name` tag is merged first so user-provided tags can override it if needed. Tags appear in `spec.forProvider.tags` for AWS resources, while labels appear in `metadata.labels`.

### Name Tag Pattern

Use the Crossplane resource name as the AWS `Name` tag value. This creates consistency between what you see in `kubectl` and the AWS Console.

**Avoid redundant type suffixes.** AWS Console shows resource type in a separate column, so adding `-vpc`, `-igw`, `-subnet` etc. is redundant:

```yaml
# GOOD - Name matches Crossplane resource name
Name: my-network           # AWS Console shows: Name=my-network, Type=VPC
Name: my-network           # AWS Console shows: Name=my-network, Type=Internet Gateway

# BAD - redundant type suffix
Name: my-network-vpc       # Type column already says "VPC"
Name: my-network-igw       # Type column already says "Internet Gateway"
```

**Exception:** When multiple resources of the same type exist (e.g., subnets per AZ), include distinguishing info:

```yaml
# Single resource - use the resource name directly
tags: {{ merge (dict "Name" $state.network.vpc.name) $state.network.tags | toJson }}

# Collection resources - include identifying info to distinguish between them
tags: {{ merge (dict "Name" $subnet.name) $state.network.tags | toJson }}
```

Examples of good `Name` tag values:
- VPC: `my-network` (matches the Network XR name)
- Internet Gateway: `my-network` (same - type column distinguishes)
- Subnet: `my-network-public-a` (distinguishes from other subnets)
- Route Table: `my-network-rt-public` or `my-network-rt-private-a`
- NAT Gateway: `my-network-nat-a` (distinguishes from other NAT gateways)

## Resource-Specific Labels and Tags (for Collections)

When iterating over collections (users, groups, pools, subnets, etc.), add a resource-specific label/tag to identify each item. Merge the base XRD values with the item-specific value:

### Kubernetes Resources

```yaml
{{- range $user := $state.identityCenter.users.items }}
{{- $userSlug := $user.userName | lower | replace " " "-" }}
---
apiVersion: identitystore.aws.m.upbound.io/v1beta1
kind: User
metadata:
  name: {{ $user.name }}
  labels: {{ merge (dict) $state.identityCenter.labels (dict "platform.example.com/identity-center-user" $userSlug) | toJson }}
...
{{- end }}
```

### AWS Resources

```yaml
{{- range $idx, $subnet := $state.network.subnets.items }}
{{- $subnetSlug := $subnet.name | lower | replace " " "-" }}
---
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: Subnet
metadata:
  name: {{ $subnet.name }}
  labels: {{ merge (dict) $state.network.labels (dict "platform.example.com/subnet" $subnetSlug) | toJson }}
spec:
  forProvider:
    vpcId: {{ $state.network.vpc.id }}
    cidrBlock: {{ $subnet.cidrBlock }}
    tags: {{ merge (dict "Name" $subnet.name) $state.network.tags (dict "platform.example.com/subnet" $subnetSlug) | toJson }}
{{- end }}
```

Note: The `Name` tag is merged first, then base tags, then resource-specific tags. This allows user-provided tags to override if needed.

This pattern ensures each resource has:
1. All standard defaults (`platform.example.com/managed`, `platform.example.com/<kind>`)
2. User-provided labels/tags from `spec.labels` and `spec.tags`
3. A resource-specific value identifying the individual item (e.g., `platform.example.com/subnet: public-1a`)

Use this pattern for any iterated resources: users, groups, pools, subnets, accounts, permission sets, etc.

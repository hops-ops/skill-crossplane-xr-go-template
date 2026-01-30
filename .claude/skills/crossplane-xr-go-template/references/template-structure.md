# Template Structure (functions/render)

**The Reconciliation Loop:** Templates run repeatedly with two inputs:
1. **Desired state** - the XR spec from the user's claim
2. **Observed state** - `$.observed.resources` containing previously rendered resources and their status

Each iteration, the template renders resources. Crossplane creates/updates them, they become Ready, and their `atProvider` values flow back into the next iteration's observed state. This continues until all resources are Ready.

**This is NOT about file ordering.** All `.gotmpl` files merge into one template. The numeric prefixes (`00-`, `10-`, etc.) are purely for human organization. Variables declared anywhere are global. What matters is writing templates that handle the loop correctly—resources may not exist yet, observed values may be empty, and you gate rendering on readiness.

## File Naming Convention

- State init: `000-state-init.yaml.gotmpl`
- Observed slices: `001-state-observed-*.yaml.gotmpl`, `002-state-observed-*.yaml.gotmpl`, etc.
- Computed state: `005-state-<xrd>.yaml.gotmpl`, `006-state-<xrd>-*.yaml.gotmpl`, etc.
- Status state: `010-state-status.yaml.gotmpl`
- Resource files: `100-*.yaml.gotmpl`, `200-*.yaml.gotmpl`, `999-status.yaml.gotmpl`

## Single $state Namespace

All template state lives in one `$state` object with clear structure:

```
$state
├── spec
│   ├── raw           # exactly what user provided (no defaults)
│   └── effective     # with defaults applied (templates use this)
├── observed          # from atProvider/XRD status
│   ├── vpc
│   ├── subnets
│   └── ...
├── <xrd-name>        # computed state for this XRD (e.g., "network", "foundation")
│   ├── name, region, providerConfig, labels, tags
│   ├── vpc
│   │   └── render, cidr, ...
│   ├── subnets
│   │   └── render, public [], private []
│   └── ...
└── status            # computed status output
    ├── ready
    ├── network (vpcId, cidr, subnets)
    └── spec (raw, effective for debugging)
```

## 00-state-init.yaml.gotmpl

Initialize $state with spec:

```yaml
{{- $xr := getCompositeResource . }}
{{- $spec := $xr.spec }}
{{- $name := $xr.metadata.name }}

{{- /* Default labels/tags: managed=true + <kind>=<name> */}}
{{- $defaults := dict
  "platform.example.com/managed" "true"
  (printf "platform.example.com/%s" (lower $xr.kind)) $name
}}
{{- $labels := merge (dict) $defaults ($spec.labels | default dict) }}
{{- $tags := merge (dict) $defaults ($spec.tags | default dict) }}

{{- $state := dict
  "spec" (dict
    "raw" $spec
    "effective" (dict
      "name" ($name | default "network")
      "region" ($spec.region | default "us-east-1")
      "providerConfigRef" (dict
        "name" (($spec.providerConfigRef | default dict).name | default "default")
        "kind" (($spec.providerConfigRef | default dict).kind | default "ProviderConfig")
      )
      "labels" $labels
      "tags" $tags
      "vpc" ($spec.vpc | default dict)
    )
  )
  "observed" (dict)
  "network" (dict)
}}
```

**Default labels and tags applied to all resources:**
- `platform.example.com/managed: "true"` - Indicates the resource is managed by the platform
- `platform.example.com/<kind>: <name>` - Dynamic label/tag with XRD kind (lowercased) and instance name

Both labels (Kubernetes metadata) and tags (AWS resources) use identical defaults. For example, a `Network` XRD named `my-vpc` would have:
```yaml
labels:
  platform.example.com/managed: "true"
  platform.example.com/network: my-vpc
tags:
  platform.example.com/managed: "true"
  platform.example.com/network: my-vpc
```

## 01-state-observed-vpc.yaml.gotmpl

Set observed slice:

```yaml
{{- $raw := $.observed.resources | default dict }}
{{- $entry := get $raw "vpc" | default dict }}
{{- $resource := $entry.resource | default dict }}
{{- $status := $resource.status | default dict }}
{{- $atProvider := $status.atProvider | default dict }}

# Check readiness
{{- $ready := false }}
{{- range ($status.conditions | default list) }}
  {{- if and (eq .type "Ready") (eq .status "True") }}
    {{- $ready = true }}
  {{- end }}
{{- end }}

# Set observed.vpc slice
{{- $state = set $state "observed" (merge $state.observed (dict "vpc" (dict
  "ready" $ready
  "id" ($atProvider.id | default "")
  "cidr" ($atProvider.cidrBlock | default "")
))) }}
```

## Verify atProvider Fields Against Provider API Docs

Before extracting observed status fields, always verify the field exists in the provider's atProvider schema. Common mistakes:

1. **Using Terraform field names** - Crossplane providers may flatten or rename fields differently than Terraform
2. **Assuming array fields** - A field like `ipv6CidrBlockAssociationSet` in Terraform might be a single `ipv6CidrBlock` string in Crossplane
3. **Using non-existent fields** - Fields like `state` may exist in AWS APIs but not be exposed in the Crossplane provider

**How to verify:** Look up each managed resource type at the Upbound Marketplace:
```
https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/v2.3.0/resources/ec2.aws.upbound.io/<Kind>/v1beta1
```

Check the `status.atProvider` schema section for available fields. Only use fields that actually exist.

**Example - VPC atProvider fields (v2.3.0):**
- `id`, `arn`, `cidrBlock`, `ipv6CidrBlock`, `ipv6AssociationId`
- `defaultNetworkAclId`, `defaultRouteTableId`, `defaultSecurityGroupId`
- `dhcpOptionsId`, `mainRouteTableId`, `ownerId`, `region`
- `enableDnsHostnames`, `enableDnsSupport`, `instanceTenancy`
- `tags`, `tagsAll`

**Example - TransitGatewayVPCAttachment atProvider fields:**
- `id`, `arn`, `transitGatewayId`, `vpcId`, `vpcOwnerId`
- `subnetIds`, `applianceModeSupport`, `dnsSupport`, `ipv6Support`
- NOT available: `state` (use readiness condition instead)

When creating test mock files in `examples/test/mocks/observed-resources/`, ensure the atProvider fields match the actual provider schema.

## 05-state-network.yaml.gotmpl

Core computed state for XRD:

```yaml
{{- $eff := $state.spec.effective }}

# Core state shared by all resources
{{- $network := dict
  "name" $eff.name
  "region" $eff.region
  "providerConfig" $eff.providerConfigRef
  "labels" $eff.labels
  "tags" $eff.tags
}}
{{- $state = set $state "network" $network }}
```

## 06-state-network-vpc.yaml.gotmpl

VPC slice with render flag:

```yaml
{{- $eff := $state.spec.effective }}

# Determine if VPC should render
{{- $render := true }}
{{- $cidr := $eff.vpc.cidr | default "" }}

# Set network.vpc slice (each slice owns its render flag)
{{- $vpc := dict
  "render" $render
  "cidr" $cidr
}}
{{- $state = set $state "network" (merge $state.network (dict "vpc" $vpc)) }}
```

## Resource Templates

Use `$state.<xrd>.*` for values:

```yaml
{{- if $state.network.vpc.render }}
---
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: VPC
metadata:
  name: {{ $state.network.name }}
  annotations:
    {{ setResourceNameAnnotation "vpc" }}
  labels: {{ $state.network.labels | toJson }}
spec:
  forProvider:
    region: {{ $state.network.region }}
    cidrBlock: {{ $state.network.vpc.cidr }}
    tags: {{ $state.network.tags | toJson }}
  providerConfigRef:
    name: {{ $state.network.providerConfig.name }}
    kind: {{ $state.network.providerConfig.kind }}
{{- end }}
```

**Labels must be applied to every resource** using `{{ $state.<xrd>.labels | toJson }}`. The default labels automatically include:
- `platform.example.com/managed: "true"` - On all resources
- `platform.example.com/<kind>: <name>` - Dynamic label identifying the XRD instance (e.g., `platform.example.com/network: my-vpc`)

User-provided labels from `spec.labels` are merged with these defaults.

## 010-state-status.yaml.gotmpl

Compute status values:

```yaml
{{- $state = set $state "status" (dict
  "ready" $state.observed.vpc.ready
  "vpcId" ($state.observed.vpc.id | default "Pending")
  "cidr" ($state.observed.vpc.cidr | default "Pending")
  "spec" (dict
    "raw" $state.spec.raw
    "effective" $state.spec.effective
  )
) }}
```

## 999-status.yaml.gotmpl

Output `$state.status`:

```yaml
{{- $xr := getCompositeResource . }}
{{- $s := $state.status }}
---
apiVersion: {{ $xr.apiVersion }}
kind: {{ $xr.kind }}
status:
  ready: {{ $s.ready }}
  vpcId: {{ $s.vpcId }}
  cidr: {{ $s.cidr }}
  spec:
    raw:
      {{- toYaml $s.spec.raw | nindent 6 }}
    effective:
      {{- toYaml $s.spec.effective | nindent 6 }}
```

## Observed-State Gating

Each slice owns its `render` flag. Gate resource rendering on the slice's render flag:

```yaml
{{- if $state.network.subnets.render }}
{{- range $subnet := $state.network.subnets.public }}
---
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: Subnet
metadata:
  name: {{ $subnet.name }}
...
{{- end }}
{{- end }}
```

Each slice computes its own render flag based on observed readiness and spec configuration, keeping resource templates clean and focused.

---
name: hops-got-observed-state
description: |
  Single $state namespace pattern for managing observed state, spec defaults,
  computed state, and status output in Go templates.
---

# Single $state Namespace Pattern

All template state lives in one `$state` object. Each file manages its slice of state.

## Mental Model

```
$state
├── spec
│   ├── raw           # exactly what user provided (no defaults)
│   └── effective     # with defaults applied (templates use this)
├── observed          # from atProvider/XRD status
├── <xrd-name>        # computed state for this XRD
└── status            # computed status output (ready, IDs, etc.)
```

- **spec.raw** - The unmodified user input, useful for debugging
- **spec.effective** - Spec with all defaults applied; templates always use this
- **observed** - Values from `$.observed.resources` (atProvider, conditions, status)
- **\<xrd-name\>** - Computed state specific to this XRD (e.g., `network`, `foundation`)
- **status** - Computed status values for XRD output (includes spec.raw/effective for debugging)

## File Structure

```
functions/render/
├── 000-state-init.yaml.gotmpl              # Initialize $state with spec.raw and spec.effective
│
├── 001-state-observed-vpc.yaml.gotmpl      # Set $state.observed.vpc
├── 002-state-observed-subnets.yaml.gotmpl  # Set $state.observed.subnets
├── 003-state-observed-gateways.yaml.gotmpl # Set $state.observed.igw, nat
├── 004-state-observed-routing.yaml.gotmpl  # Set $state.observed.routeTables
│
├── 005-state-network.yaml.gotmpl           # Set $state.network core (name, region, tags)
├── 006-state-network-vpc.yaml.gotmpl       # Set $state.network.vpc + render flag
├── 007-state-network-subnets.yaml.gotmpl   # Set $state.network.subnets + render flag
├── 008-state-network-nat.yaml.gotmpl       # Set $state.network.nat + render flag
│
├── 010-state-status.yaml.gotmpl            # Set $state.status (computed from observed + effective)
│
├── 100-vpc.yaml.gotmpl                     # if $state.network.vpc.render
├── 200-subnets.yaml.gotmpl                 # if $state.network.subnets.render
├── 300-gateways.yaml.gotmpl
├── 400-nat.yaml.gotmpl                     # if $state.network.nat.render
└── 999-status.yaml.gotmpl                  # Outputs $state.status
```

For simpler XRDs, consolidate files (e.g., single `00-state-init.yaml.gotmpl` and `05-state-network.yaml.gotmpl`).

## Building $state

### 00-state-init.yaml.gotmpl - Initialize with spec

```yaml
{{- $xr := getCompositeResource . }}
{{- $metadata := $xr.metadata }}
{{- $spec := $xr.spec }}

# Initialize $state with raw spec and effective spec (with defaults)
{{- $state := dict
  "spec" (dict
    "raw" $spec
    "effective" (dict
      "name" ($metadata.name | default "network")
      "region" ($spec.region | default "us-east-1")
      "providerConfigRef" (dict
        "name" (($spec.providerConfigRef | default dict).name | default "default")
        "kind" (($spec.providerConfigRef | default dict).kind | default "ProviderConfig")
      )
      "tags" (merge (dict "platform" "true") ($spec.tags | default dict))
      "vpc" (merge (dict "cidr" "") ($spec.vpc | default dict))
      "subnets" ($spec.subnets | default list)
      "nat" (merge (dict "enabled" false "strategy" "SingleAz") ($spec.nat | default dict))
    )
  )
  "observed" (dict)
  "network" (dict)
}}
```

### 01-state-observed-vpc.yaml.gotmpl - Set observed slice

```yaml
{{- $raw := $.observed.resources | default dict }}
{{- $entry := get $raw "vpc" | default dict }}
{{- $resource := $entry.resource | default dict }}
{{- $status := $resource.status | default dict }}
{{- $atProvider := $status.atProvider | default dict }}

# Check readiness from conditions
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
  "ipv6Cidr" ($atProvider.ipv6CidrBlock | default "")
))) }}
```

### 02-state-observed-subnets.yaml.gotmpl - Build observed subnets

```yaml
{{- $raw := $.observed.resources | default dict }}
{{- $subnets := dict }}

# Extract all subnet observations
{{- range $name, $entry := $raw }}
  {{- if hasPrefix "subnet-" $name }}
    {{- $resource := $entry.resource | default dict }}
    {{- $status := $resource.status | default dict }}
    {{- $atProvider := $status.atProvider | default dict }}

    {{- $ready := false }}
    {{- range ($status.conditions | default list) }}
      {{- if and (eq .type "Ready") (eq .status "True") }}
        {{- $ready = true }}
      {{- end }}
    {{- end }}

    {{- $subnets = set $subnets $name (dict
      "ready" $ready
      "id" ($atProvider.id | default "")
      "cidr" ($atProvider.cidrBlock | default "")
      "az" ($atProvider.availabilityZone | default "")
    ) }}
  {{- end }}
{{- end }}

{{- $state = set $state "observed" (merge $state.observed (dict "subnets" $subnets)) }}
```

### 05-state-network.yaml.gotmpl - Core computed state

```yaml
{{- $eff := $state.spec.effective }}

# Core network state - shared by all resources
{{- $network := dict
  "name" $eff.name
  "region" $eff.region
  "providerConfig" $eff.providerConfigRef
  "tags" $eff.tags
}}
{{- $state = set $state "network" $network }}
```

### 06-state-network-vpc.yaml.gotmpl - VPC slice with render flag

```yaml
{{- $eff := $state.spec.effective }}

# VPC always renders
{{- $render := true }}

# Get CIDR from spec or observed (for IPAM mode)
{{- $cidr := $eff.vpc.cidr }}
{{- if eq $cidr "" }}
  {{- $cidr = $state.observed.vpc.cidr }}
{{- end }}

# Set network.vpc slice
{{- $vpc := dict
  "render" $render
  "cidr" $cidr
  "ready" $state.observed.vpc.ready
}}
{{- $state = set $state "network" (merge $state.network (dict "vpc" $vpc)) }}
```

### 07-state-network-subnets.yaml.gotmpl - Subnets slice

```yaml
{{- $eff := $state.spec.effective }}

# Build subnet lists
{{- $publicSubnets := list }}
{{- $privateSubnets := list }}

{{- range $subnet := $eff.subnets }}
  {{- $config := dict
    "name" (printf "%s-%s" $state.network.name $subnet.name)
    "cidr" $subnet.cidr
    "az" (printf "%s%s" $state.network.region $subnet.availabilityZone)
    "public" ($subnet.public | default false)
  }}
  {{- if $config.public }}
    {{- $publicSubnets = append $publicSubnets $config }}
  {{- else }}
    {{- $privateSubnets = append $privateSubnets $config }}
  {{- end }}
{{- end }}

# Render subnets if VPC is ready
{{- $render := $state.network.vpc.ready }}

# Set network.subnets slice
{{- $subnets := dict
  "render" $render
  "public" $publicSubnets
  "private" $privateSubnets
  "hasPublic" (gt (len $publicSubnets) 0)
  "hasPrivate" (gt (len $privateSubnets) 0)
}}
{{- $state = set $state "network" (merge $state.network (dict "subnets" $subnets)) }}
```

### 08-state-network-nat.yaml.gotmpl - NAT slice

```yaml
{{- $eff := $state.spec.effective }}

# NAT renders if enabled AND has public subnets AND VPC is ready
{{- $render := and $eff.nat.enabled $state.network.subnets.hasPublic $state.network.vpc.ready }}

# Set network.nat slice
{{- $nat := dict
  "render" $render
  "enabled" $eff.nat.enabled
  "strategy" $eff.nat.strategy
}}
{{- $state = set $state "network" (merge $state.network (dict "nat" $nat)) }}
```

## Using $state in Resource Templates

### 10-vpc.yaml.gotmpl

```yaml
{{- if $state.network.vpc.render }}
---
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: VPC
metadata:
  name: {{ $state.network.name }}
  annotations:
    {{ setResourceNameAnnotation "vpc" }}
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

### 20-subnets.yaml.gotmpl

```yaml
{{- if $state.network.subnets.render }}
{{- range $subnet := $state.network.subnets.public }}
---
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: Subnet
metadata:
  name: {{ $subnet.name }}
  annotations:
    {{ setResourceNameAnnotation (printf "subnet-%s" $subnet.name) }}
spec:
  forProvider:
    region: {{ $state.network.region }}
    vpcIdRef:
      name: {{ $state.network.name }}
    cidrBlock: {{ $subnet.cidr }}
    availabilityZone: {{ $subnet.az }}
    mapPublicIpOnLaunch: true
    tags: {{ $state.network.tags | toJson }}
  providerConfigRef:
    name: {{ $state.network.providerConfig.name }}
    kind: {{ $state.network.providerConfig.kind }}
{{- end }}
{{- end }}
```

### 010-state-status.yaml.gotmpl - Compute status slice

Compute all status values in a dedicated state file. This keeps 999-status.yaml.gotmpl simple.

```yaml
{{- $eff := $state.spec.effective }}
{{- $obs := $state.observed }}

# Compute overall readiness
{{- $ready := $obs.vpc.ready }}

# Compute network status
{{- $networkStatus := dict
  "vpcId" ($obs.vpc.id | default "Pending")
  "cidr" (dict
    "ipv4" ($obs.vpc.cidr | default "Pending")
  )
}}

# Build subnets status
{{- $subnetsStatus := list }}
{{- range $name, $subnet := $obs.subnets }}
  {{- $subnetsStatus = append $subnetsStatus (dict
    "name" $name
    "id" ($subnet.id | default "Pending")
    "cidr" ($subnet.cidr | default "Pending")
  ) }}
{{- end }}
{{- $networkStatus = set $networkStatus "subnets" $subnetsStatus }}

# Set $state.status
{{- $state = set $state "status" (dict
  "ready" $ready
  "network" $networkStatus
  "spec" (dict
    "raw" $state.spec.raw
    "effective" $state.spec.effective
  )
) }}
```

### 999-status.yaml.gotmpl - Output status

The status template simply outputs `$state.status`. All computation is done in the state file.

```yaml
{{- $xr := getCompositeResource . }}
{{- $s := $state.status }}
---
apiVersion: {{ $xr.apiVersion }}
kind: {{ $xr.kind }}
status:
  ready: {{ $s.ready }}

  network:
    vpcId: {{ $s.network.vpcId }}
    cidr:
      ipv4: {{ $s.network.cidr.ipv4 }}
    {{- if gt (len $s.network.subnets) 0 }}
    subnets:
      {{- range $subnet := $s.network.subnets }}
      - name: {{ $subnet.name }}
        id: {{ $subnet.id }}
        cidr: {{ $subnet.cidr }}
      {{- end }}
    {{- end }}

  # Expose spec for debugging
  spec:
    raw:
      {{- toYaml $s.spec.raw | nindent 6 }}
    effective:
      {{- toYaml $s.spec.effective | nindent 6 }}
```

This allows users to run `kubectl get network my-network -o yaml` and see:

```yaml
status:
  ready: true
  network:
    vpcId: vpc-0123456789abcdef0
    cidr:
      ipv4: 10.0.0.0/16
    subnets:
      - name: public-a
        id: subnet-abc123
        cidr: 10.0.0.0/24
  spec:
    raw:
      region: us-east-1
      vpc:
        cidr: 10.0.0.0/16
      # user didn't specify tags, providerConfigRef...
    effective:
      region: us-east-1
      providerConfigRef:
        name: default           # defaulted!
        kind: ProviderConfig    # defaulted!
      tags:
        platform: "true"        # defaulted!
      vpc:
        cidr: 10.0.0.0/16
```

## Key Benefits

1. **Single namespace** - Just `$state`, no separate `$observed` variable
2. **Clear structure** - `spec.raw`, `spec.effective`, `observed`, `<xrd>`, `status` are distinct concerns
3. **Debuggable** - Status exposes `spec.raw` vs `spec.effective` so users see defaults applied
4. **Co-located render flags** - Each slice decides if it should render
5. **Self-documenting** - `$state.network.subnets.public` is clear
6. **Composable** - Each file sets its slice independently
7. **Simple status template** - 999-status.yaml.gotmpl just outputs `$state.status`, no logic

## Splitting State Files

When a state file exceeds ~150 lines, split by concern:

| File | Content |
|------|---------|
| `005-state-network.yaml.gotmpl` | Core state (name, region, tags, providerConfig) |
| `006-state-network-vpc.yaml.gotmpl` | VPC slice with render flag |
| `007-state-network-subnets.yaml.gotmpl` | Subnets slice with render flag |
| `008-state-network-nat.yaml.gotmpl` | NAT slice with render flag |
| `010-state-status.yaml.gotmpl` | Status slice (ready, IDs, spec.raw/effective) |

Variables declared in earlier files are available in later files—Go templates merge all `.gotmpl` files.

---
name: hops-got-template-simplification
description: |
  Template simplification patterns: making fields required, removing unnecessary guards,
  collapsing intermediate variables, simplifying observed-value extraction, and refactoring checklist.
---

# Template Simplification Patterns

Apply these patterns when refactoring existing XRD templates to reduce complexity.

## 1. Make Required Fields Explicit in Schema

```yaml
# Bad - optional with complex defaulting logic in templates
homeRegion:
  type: string
  description: Defaults to first operatingRegion or us-east-1

# Good - required, no defaulting needed
required:
  - region
region:
  type: string
  description: AWS region hosting the resource.
```

This eliminates template conditionals like:

```go
// Remove this pattern - 10+ lines of defaulting logic
{{ if and (not $homeRegion) (gt (len $operatingRegions) 0) }}
  {{- $homeRegion = index $operatingRegions 0 }}
{{ end }}
{{ if not $homeRegion }}
  {{- $homeRegion = "us-east-1" }}
{{ end }}

// Replace with
{{ $region := $spec.region }}  // Required - no default needed
```

## 2. Remove Guards for Required Fields

If the schema has `required: [name]` or `minItems: 1`, don't check for existence:

```go
// Bad - pools is required with minItems: 1, check is always true
{{ $ipamHasPools := gt (len $ipamPools) 0 }}
{{- if $ipamHasPools }}

// Good - just use the list directly
{{ range $ipamPools }}
```

Same for required item fields:

```go
// Bad - pool.name is required per schema
{{- if $poolName }}
  ...
{{- end }}

// Good - remove the guard entirely
```

## 3. Collapse Intermediate Variables

```go
// Bad - two variables where one line works
{{ $delegatedAdmin := $spec.delegatedAdminAccountRef | default (dict) }}
{{ $delegatedAdminName := $delegatedAdmin.name | default "" }}

// Good - inline extraction
{{ $delegatedAdminName := ($spec.delegatedAdminAccountRef).name | default "" }}
```

## 4. Simplify Observed-Value Extraction

```go
// Bad - verbose candidate pattern (adds ~15 lines per resource)
{{ $observedIpamId := "" }}
{{ with $ipamObservation }}
  {{- $resource := .resource | default (dict) }}
  {{- $status := $resource.status | default (dict) }}
  {{- $atProvider := $status.atProvider | default (dict) }}
  {{- $candidateId := $atProvider.id | default "" }}
  {{- if $candidateId }}
    {{- $observedIpamId = $candidateId }}
  {{- end }}
{{ end }}

// Good - direct extraction with nil-safe chaining (~4 lines)
{{ $ipamObs := (get $observed "ipam") | default (dict) }}
{{ $ipamResource := $ipamObs.resource | default (dict) }}
{{ $ipamStatus := $ipamResource.status | default (dict) }}
{{ $ipamAtProvider := $ipamStatus.atProvider | default (dict) }}
{{ $observedIpamId := $ipamAtProvider.id | default "" }}
```

For loops extracting multiple resources:

```go
// Good - compact loop
{{ range $pool := $ipamPools }}
  {{- $poolName := $pool.name }}
  {{- $poolObs := (get $observed (printf "ipam-pool-%s" $poolName)) | default (dict) }}
  {{- $poolAtProvider := (($poolObs.resource | default (dict)).status | default (dict)).atProvider | default (dict) }}
  {{- $_ := set $observedPools $poolName (dict "id" ($poolAtProvider.id | default "") "arn" ($poolAtProvider.arn | default "")) }}
{{ end }}
```

## 5. Remove Backwards-Compatibility Aliases

If no examples use a deprecated field, remove it:

```yaml
# Bad - keeping unused backwards-compat
allocationNetmaskLength:
  type: integer
  description: Shortcut for allocationDefaultNetmaskLength; kept for backwards compatibility.

# Good - just use the canonical field
allocationDefaultNetmaskLength:
  type: integer
```

And remove the template support:

```go
// Bad
{{- $allocationDefault := $pool.allocationDefaultNetmaskLength | default $pool.allocationNetmaskLength }}

// Good
{{- $allocationDefault := $pool.allocationDefaultNetmaskLength }}
```

## 6. Inline Simple Conditionals

```go
// Bad - intermediate variable for one-time use
{{ range $ipamPools }}
  {{- $poolRegion := .region | default .locale | default $region }}
  {{- if $poolRegion }}
    {{- $_ = set $ipamRegionSet $poolRegion true }}
  {{- end }}
{{ end }}

// Good - inline, remove always-true guard
{{ range $ipamPools }}
  {{- $_ = set $ipamRegionSet (.region | default .locale | default $region) true }}
{{ end }}
```

## 7. Remove Cosmetic-Only Fields

If a field is only echoed to status but never controls behavior, consider removing it:

```go
// Questionable - managementMode only appears in status, never used in logic
{{ $managementMode := $spec.managementMode | default "self" }}
// ... later in 99-status.yaml.gotmpl ...
managementMode: {{ $managementMode | quote }}
```

Users can read their own spec - echoing it back adds no value unless downstream consumers rely on it.

## Refactoring Checklist

1. [ ] Audit defined variables - remove any not referenced elsewhere
2. [ ] Make core fields required instead of defaulting them
3. [ ] Remove `if $field` guards where field is schema-required
4. [ ] Collapse observed-value extraction verbosity
5. [ ] Remove backwards-compat aliases if unused in examples
6. [ ] Inline one-time-use intermediate variables
7. [ ] Run `make validate:all && make test` after each change

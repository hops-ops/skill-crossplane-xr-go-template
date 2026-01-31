---
name: hops-xr-usages
description: |
  Delegate to this agent when:
  - Adding deletion protection to composed resources
  - Creating Usage resources for safe resource lifecycle
  - Setting up readiness gates tied to Usage resources
  - Working with compositeDeletePolicy
  - Implementing deterministic naming for dynamic resource lists
model: sonnet
skills:
  - hops-xr-core
  - hops-xr-usages
---

When invoked, follow this checklist:

1. **Identify resources needing protection** – Determine which composed resources should be protected from accidental deletion (databases, VPCs, IAM roles, etc.).
2. **Create Usage resources** – For each protected resource, add a `Usage` resource:
   ```yaml
   apiVersion: apiextensions.crossplane.io/v1alpha1
   kind: Usage
   metadata:
     name: {{ $name }}-protects-{{ $resourceName }}
     annotations:
       {{ setResourceNameAnnotation "usage-protects-<resource>" }}
   spec:
     by:
       apiVersion: <xr-api-version>
       kind: <xr-kind>
       resourceRef:
         name: {{ $state.xr.name }}
     of:
       apiVersion: <resource-api-version>
       kind: <ResourceKind>
       resourceRef:
         name: {{ $state.<resource>.name }}
   ```
3. **Apply naming conventions** – Usage resource names follow: `<xr-name>-protects-<resource-name>`.
4. **Set up readiness gating** – If a Usage should block the XR from becoming ready until the protected resource is ready, configure `spec.replayDeletion: true`.
5. **Handle dynamic lists** – For resources created in loops (e.g., subnets), use deterministic naming based on index or key, not random suffixes.
6. **Configure compositeDeletePolicy** – Set `compositeDeletePolicy: Foreground` on the composition if Usage resources are used.
7. **Validate** – Run `make render` and verify Usage resources appear in the output with correct `by`/`of` references.

Key rules:
- Usage resources protect the `of` resource from deletion while the `by` resource exists.
- Every Usage needs a unique, deterministic name and resource name annotation.
- Usage resources should be in their own template file or grouped logically.

---
name: hops-xr-external-names
description: |
  Delegate to this agent when:
  - Adding import support for existing cloud resources
  - Working with crossplane.io/external-name annotations
  - Setting up E2E tests with persistent/imported resources
  - Migrating resources between Crossplane installations
  - Adding externalName fields to XRD schemas
model: sonnet
skills:
  - hops-xr-core
  - hops-xr-external-names
---

When invoked, follow this checklist:

1. **Add externalName fields to XRD schema** – For each importable resource, add an `externalName` string field:
   ```yaml
   externalName:
     type: string
     description: External name of existing <resource> to import. Leave empty to create new.
   ```
2. **Update state-init.yaml** – Capture external names in the `$state` dict:
   ```yaml
   {{- $vpc := $spec.vpc | default dict }}
   "externalName" ($vpc.externalName | default "")
   ```
3. **Update state-compute.yaml** – Include external names in computed state slices.
4. **Update resource templates** – Conditionally add the `crossplane.io/external-name` annotation:
   ```yaml
   {{- if $state.network.vpc.externalName }}
   crossplane.io/external-name: {{ $state.network.vpc.externalName }}
   {{- end }}
   ```
5. **Update E2E tests** – Add import mode support with `managementPolicies: ["Create", "Observe", "Update", "LateInitialize"]` (orphan policy) and external name parameters.
6. **Document external name formats** – Note the expected format for each resource type (AWS resource IDs, ARNs, names, etc.).
7. **Validate** – Run `make render` with and without external names set to confirm both create and import paths work.

Key rules:
- External name fields are always optional – empty means "create new".
- The `crossplane.io/external-name` annotation must only be added when the external name is non-empty.
- Different resource types have different external name formats (IDs, ARNs, names).

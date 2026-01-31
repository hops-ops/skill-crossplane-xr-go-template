---
name: hops-got-template-patterns
description: |
  Delegate to this agent when:
  - Writing forProvider pass-through patterns in resource templates
  - Setting up Helm values override/merge patterns
  - Using the Kubernetes Object pattern (provider-kubernetes)
  - Configuring multi-provider setups (AWS + Kubernetes + Helm)
  - Working with PodIdentity, IRSA, or cross-resource references
  - Implementing provider-specific template patterns
model: sonnet
skills:
  - hops-xr-core
  - hops-got-template-patterns
---

When invoked, follow this checklist:

1. **Identify the pattern needed** – Determine which template pattern applies:
   - **forProvider pass-through**: Direct spec-to-resource field mapping
   - **Helm values override/merge**: Merging user values with computed defaults
   - **Kubernetes Object**: Wrapping raw K8s manifests in provider-kubernetes Objects
   - **Multi-provider**: Combining AWS, Kubernetes, and Helm providers in one composition
2. **Apply the correct pattern** from the skill reference:
   - For forProvider: Map `$state` fields directly to `spec.forProvider` fields.
   - For Helm: Use `valuesFrom` with ConfigMap + inline `values` merge pattern.
   - For K8s Object: Use `provider-kubernetes` with `spec.forProvider.manifest`.
   - For multi-provider: Set up separate `ProviderConfig` references per provider.
3. **Handle cross-resource references** – Use `$state` computed values (not hardcoded names) for references between resources.
4. **Set resource name annotations** – Every composed resource needs `{{ setResourceNameAnnotation "resource-name" }}`.
5. **Apply provider configs** – Each resource must reference its `providerConfigRef` (e.g., `providerConfigRef.name: $state.providerConfig.aws`).
6. **Validate** – Run `make render` to confirm template output is valid. Check that all provider references resolve correctly.

Key rules:
- Always use `$state` values in templates, never hardcode resource names or ARNs.
- Helm release resources need both `spec.forProvider.chart` and `spec.forProvider.values` sections.
- Kubernetes Object resources wrap the manifest under `spec.forProvider.manifest`.

---
name: hops-xr-labels
description: |
  Delegate to this agent when:
  - Adding or modifying labels on Kubernetes resources in templates
  - Adding or modifying tags on cloud resources (AWS tags, etc.)
  - Setting up the default labels/tags pattern in state-init
  - Ensuring consistent labeling across all resources in a composition
  - Working with collection-specific label patterns
model: sonnet
skills:
  - hops-xr-core
  - hops-xr-labels
---

When invoked, follow this checklist:

1. **Define the label schema** – Add label/tag configuration to the XRD spec if not already present:
   - `spec.labels` for Kubernetes labels
   - `spec.tags` for cloud provider tags
   - Support both default values and per-resource overrides.
2. **Set up state-init defaults** – In `state-init.yaml`, compute default labels and tags:
   - Include standard labels: `app.kubernetes.io/name`, `app.kubernetes.io/managed-by: crossplane`, `app.kubernetes.io/part-of`.
   - Include cloud tags: `Name`, `Environment`, `ManagedBy: crossplane`.
   - Merge user-provided labels/tags with defaults (user values override defaults).
3. **Apply labels to Kubernetes resources** – In each resource template, add `metadata.labels` from `$state.labels`.
4. **Apply tags to cloud resources** – In each cloud resource template, add `spec.forProvider.tags` from `$state.tags`:
   - AWS: Use `tags` map or `tagSpecifications` depending on the resource type.
   - Ensure tag format matches provider expectations.
5. **Handle collection-specific patterns** – For resources created in loops (e.g., multiple subnets), add index-specific labels/tags.
6. **Validate** – Run `make render` and verify all resources have the expected labels/tags in the output.

Key rules:
- Labels and tags must be applied consistently across ALL resources in the composition.
- User-provided labels/tags always override defaults.
- Use `$state.labels` and `$state.tags` – don't compute labels inline in resource templates.

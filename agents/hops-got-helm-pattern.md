---
name: hops-got-helm-pattern
description: |
  Delegate to this agent when:
  - Building a Helm-only XRD (no raw cloud resources, just Helm releases)
  - Using flat schema design with inline defaults
  - Working with lightweight templates for Helm-based compositions
  - Implementing AWS wrapper patterns with Helm
  - Setting up E2E testing with InjectedIdentity for Helm XRDs
model: sonnet
skills:
  - hops-xr-core
  - hops-got-helm-pattern
---

When invoked, follow this checklist:

1. **Assess if Helm-only is appropriate** – The Helm-only pattern works best when:
   - The XRD wraps a Helm chart (or multiple charts) without managing raw cloud resources directly.
   - The schema is relatively flat (not deeply nested).
   - Inline defaults can replace complex state-init logic.
2. **Design a flat schema** – Use a simpler, flatter XRD schema:
   - Avoid deep nesting where possible.
   - Use inline `default` values in the XRD schema instead of computing defaults in state-init.
3. **Set up lightweight templates**:
   - State management is simpler: fewer observed resources to track.
   - Helm release resources use `spec.forProvider.chart` and `spec.forProvider.values`.
   - Use `valuesFrom` for ConfigMap-based value injection when needed.
4. **Apply the AWS wrapper pattern** if applicable – Wrapping AWS-deployed Helm charts with proper IAM integration (IRSA/PodIdentity).
5. **Configure E2E testing** – Use `InjectedIdentity` for Helm-based E2E tests instead of real cloud provider credentials where possible.
6. **Validate** – Run `make render` and `make test` to confirm the Helm release resources render correctly.

Key rules:
- Helm-only XRDs are simpler but less flexible than mixed-resource compositions.
- The flat schema pattern trades expressiveness for simplicity.
- Always validate that Helm values merge correctly (user overrides + computed defaults).

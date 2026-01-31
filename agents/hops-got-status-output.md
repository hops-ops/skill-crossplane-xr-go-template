---
name: hops-got-status-output
description: |
  Delegate to this agent when:
  - Designing or modifying XRD status fields
  - Exposing observed cloud resource values in the XR status
  - Setting up status.yaml template for status patches
  - Applying the anti-corruption layer pattern for status
  - Adding new status outputs to an existing XRD
model: sonnet
skills:
  - hops-xr-core
  - hops-got-status-output
---

When invoked, follow this checklist:

1. **Identify what to expose** – Determine which observed cloud values need to be surfaced in the XR status (e.g., VPC ID, Role ARN, endpoint URLs).
2. **Design the status schema** – Add typed fields to the XRD `status` section:
   - Use specific types (not just `string` for everything).
   - Group related fields logically (e.g., `status.vpc.id`, `status.iam.roleArn`).
   - Add `description` for each field.
3. **Apply the anti-corruption layer** – Status fields should expose *meaningful* values, not raw provider output. Transform or rename fields to match your domain model.
4. **Update state-init.yaml** – Extract observed values from `$observed` resources and store in `$state`.
5. **Update status.yaml** – Create status patch entries that read from `$state` and write to the XR status:
   ```yaml
   - type: PatchDesired
     patch:
       type: MergeOptions
       mergeOptions:
         keepMapValues: true
   ```
6. **Guard for first render** – Status fields should handle missing observed values gracefully (empty strings, not errors).
7. **Validate** – Run `make render` and verify status output appears in the rendered desired XR.

Key rules:
- Status fields expose *observed* state, not *desired* state. They reflect what actually exists in the cloud.
- Use the `$state` namespace – don't read from `$observed` directly in `status.yaml`.
- Every status field in the XRD schema must have a corresponding entry in `status.yaml`.

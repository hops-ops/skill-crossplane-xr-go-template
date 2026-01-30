# Status Output Design

Status should expose **observed values from cloud resources**, not echo back inputs. This serves two purposes:

1. **Useful for integrations** - Other XRDs and systems can reference the status to get cloud resource identifiers (ARNs, IDs, names)
2. **Anti-corruption layer** - Typed status insulates consumers from provider schema changes

## What Belongs in Status

- `ready` - Boolean computed from all composed resources' readiness conditions
- Resource identifiers from `atProvider`: ARNs, IDs, names
- Values that other XRDs need to reference (e.g., role ARN for ServiceAccount annotations)

## What Does NOT Belong in Status

- Echoed inputs (the user already knows what they provided)
- Intermediate computed values only used internally
- Full `atProvider` pass-through (can get out of control, loses the anti-corruption benefit)

## Anti-Corruption Principle

If a provider changes its `atProvider` schema, a typed status definition protects consumers. They continue receiving the same fields until you update the XRD—giving you time to handle the migration deliberately rather than breaking downstream consumers unexpectedly.

## Bad Example - Echoing Inputs

```yaml
# DON'T DO THIS - user already knows their inputs
status:
  accountId: "123456789012"        # echoed from spec.accountId
  oidcIssuer: "oidc.eks..."        # echoed from spec.oidc
  serviceAccountName: "my-app"    # echoed from spec.serviceAccount.name
```

## Bad Example - Untyped atProvider Pass-Through

```yaml
# DON'T DO THIS - loses anti-corruption, can get out of control
status:
  role:
    atProvider: {{ $obs.role.atProvider | toJson }}  # full pass-through
```

## Good Example - Typed Observed Values

```yaml
# DO THIS - minimal, typed, useful fields
status:
  ready: {{ $s.ready }}
  role:
    arn: {{ $s.role.arn | default "" | quote }}
    name: {{ $s.role.name | default "" | quote }}
  policy:
    arn: {{ $s.policy.arn | default "" | quote }}
    name: {{ $s.policy.name | default "" | quote }}
```

## XRD Status Schema Definition

```yaml
status:
  type: object
  properties:
    ready:
      type: boolean
      description: Whether all composed resources are ready.
    role:
      type: object
      description: Observed state from the IAM Role.
      properties:
        arn:
          type: string
          description: ARN of the IAM role - use this for ServiceAccount annotations.
        name:
          type: string
          description: Name of the IAM role in AWS.
    policy:
      type: object
      description: Observed state from the IAM Policy.
      properties:
        arn:
          type: string
          description: ARN of the IAM policy.
        name:
          type: string
          description: Name of the IAM policy in AWS.
```

## Decision Criteria

When deciding what to include in status, ask: "Would another XRD or external system need this value?" If no, leave it out.

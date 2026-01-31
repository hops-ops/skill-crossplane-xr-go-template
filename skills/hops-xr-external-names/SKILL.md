---
name: hops-xr-external-names
description: |
  External name support for importing existing cloud resources into Crossplane management,
  E2E test persistence, and resource migration between installations.
---

# External Names for Resource Import

XRDs should support importing existing cloud resources via the `crossplane.io/external-name` annotation. This enables:
1. Adopting pre-existing infrastructure into Crossplane management
2. Re-running E2E tests against persistent resources without recreation
3. Migrating resources between Crossplane installations

## XRD Schema Pattern

Add `externalName` fields to each importable resource section:

```yaml
# In apis/<plural>/definition.yaml
spec:
  type: object
  properties:
    # For a VPC resource
    vpc:
      type: object
      properties:
        cidr:
          type: string
        externalName:
          type: string
          description: External name (AWS resource ID) of existing VPC to import. Leave empty to create new.

    # For an IAM Role
    role:
      type: object
      properties:
        name:
          type: string
        externalName:
          type: string
          description: External name of existing IAM role to import. Leave empty to create new.
```

## State Init Pattern

Capture external names in state-init:

```yaml
{{- $vpc := $spec.vpc | default dict }}

{{- $state := dict
  "spec" (dict
    "effective" (dict
      "vpc" (dict
        "cidr" ($vpc.cidr | default "")
        "externalName" ($vpc.externalName | default "")
      )
    )
  )
}}
```

## Computed State Pattern

Include external names in the computed state slice:

```yaml
{{- $vpc := dict
  "render" true
  "name" $eff.name
  "cidr" $eff.vpc.cidr
  "externalName" $eff.vpc.externalName
}}
{{- $state = set $state "network" (merge $state.network (dict "vpc" $vpc)) }}
```

## Resource Template Pattern

Conditionally add the `crossplane.io/external-name` annotation:

```yaml
{{- if $state.network.vpc.render }}
---
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: VPC
metadata:
  name: {{ $state.network.name }}
  annotations:
    {{ setResourceNameAnnotation "vpc" }}
    {{- if $state.network.vpc.externalName }}
    crossplane.io/external-name: {{ $state.network.vpc.externalName }}
    {{- end }}
spec:
  ...
{{- end }}
```

## E2E Test Import Pattern

E2E tests should support both ephemeral (create/delete) and persistent (import) modes:

```python
# Orphan policy - no Delete means resources persist in AWS after claim deletion
_orphan = ["Create", "Observe", "Update", "LateInitialize"]

# External names for import (leave empty for create, populate for import)
_vpc_external_name = "vpc-08b36c3876f7483c6"
_role_external_name = "my-existing-role"

# Persistent test claim with import
platform.Network{
    metadata.name = "persistent-test"
    spec = {
        managementPolicies = _orphan
        vpc = {
            if _vpc_external_name:
                externalName = _vpc_external_name
        }
    }
}
```

## Common External Name Formats

- **VPC/Subnet/IGW**: AWS resource ID (e.g., `vpc-08b36c3876f7483c6`, `subnet-0abc123`)
- **IAM Role**: Role name (e.g., `my-role-name`)
- **IAM Policy Attachment**: `role-name/policy-arn` (e.g., `my-role/arn:aws:iam::aws:policy/ReadOnlyAccess`)
- **OIDC Provider**: Provider ARN (e.g., `arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com`)
- **S3 Bucket**: Bucket name
- **Route53 Zone**: Zone ID

## Getting External Names After Creation

```bash
# VPC
kubectl get vpc <name> -o jsonpath='{.status.atProvider.id}'

# IAM Role
kubectl get role <name> -o jsonpath='{.metadata.annotations.crossplane\.io/external-name}'

# Generic pattern
kubectl get <kind> -l crossplane.io/composite=<xr-name> \
  -o jsonpath='{.items[0].metadata.annotations.crossplane\.io/external-name}'
```

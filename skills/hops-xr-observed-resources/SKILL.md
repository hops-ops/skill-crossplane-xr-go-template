---
name: hops-xr-observed-resources
description: |
  Creating observed resource test mocks for Crossplane reconciliation simulation,
  step-by-step mock creation process, and atProvider field verification.
---

# Creating Observed Resources for Testing

Observed resources simulate Crossplane's reconciliation loop. Each step represents one iteration where resources become Ready and their `atProvider` values become available for downstream resources.

## Directory Structure

```
examples/test/mocks/observed-resources/<example-name>/steps/
├── 1/           # First reconciliation - initial resources Ready
├── 2/           # Second reconciliation - dependent resources Ready
├── 3/           # Continue until all resources Ready
└── 4/
```

## Step-by-Step Process

### 1. Render without observed resources

See what gets created first:

```bash
up composition render --xrd=apis/<plural>/definition.yaml \
  apis/<plural>/composition.yaml examples/<plural>/standard.yaml
```

### 2. Create step 1 mocks

For resources that rendered, add mock `status` with:
- `conditions: [{type: Ready, status: "True"}, {type: Synced, status: "True"}]`
- `atProvider` with IDs, ARNs, and fields templates read

### 3. Render with step 1 observed

See what new resources appear:

```bash
up composition render ... --observed-resources=.../steps/1/
```

### 4. Create step 2 mocks

Symlink step 1 files and add new resources:

```bash
cd examples/test/mocks/observed-resources/standard/steps/2
for f in ../1/*.yaml; do ln -s "$f" "$(basename $f)"; done
# Then create new files for resources that appeared in step 2
```

### 5. Repeat

Continue until all resources are Ready (status shows `reason: Available`).

## Example Observed Resource

```yaml
apiVersion: ec2.aws.m.upbound.io/v1beta1
kind: VPCIpam
metadata:
  name: platform
  annotations:
    crossplane.io/composition-resource-name: ipam
    gotemplating.fn.crossplane.io/composition-resource-name: ipam
status:
  conditions:
    - type: Ready
      status: "True"
    - type: Synced
      status: "True"
  atProvider:
    id: ipam-0123456789abcdef0
    arn: arn:aws:ec2:us-east-1:123456789012:ipam/ipam-0123456789abcdef0
    defaultPrivateScopeId: ipam-scope-0aaa111122223333a
    defaultPublicScopeId: ipam-scope-0bbb444455556666b
```

## Key Requirements

- **Both annotations required** - match names from `{{ setResourceNameAnnotation "..." }}`
- **Include all atProvider fields** that templates read (IDs, ARNs, scope IDs)
- **Use symlinks between steps** to avoid duplication - only create new files for newly Ready resources
- **Mock realistic AWS IDs** (e.g., `ipam-0123456789abcdef0`, `arn:aws:ec2:...`)

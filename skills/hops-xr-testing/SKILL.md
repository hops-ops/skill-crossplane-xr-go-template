---
name: hops-xr-testing
description: |
  KCL unit testing patterns, E2E test setup, test scaffolding workflow, typed vs untyped tests,
  inline fixtures, observedResources for gated features, and cross-package E2E dependencies.
---

# Testing XRD Configurations

## Test Scaffolding Workflow

The `up` CLI provides scaffolding generators for tests. Since the tool updates and provides new features/defaults, we use a hybrid approach.

**CRITICAL: The scaffolding generator is DESTRUCTIVE!** Running `up test generate <name>` will DELETE any existing test with that name. Never run it on your actual test names.

### Workflow for Creating Tests

**For NEW XRDs (first time creating tests):**

You can generate scaffolding directly with your desired test name:
```bash
# First time only - creates the test structure
up test generate render --language=kcl
up test generate <xrd-name> --language=kcl --e2e
```

**For EXISTING tests (refreshing imports or updating patterns):**

Always use temporary scaffolding, then merge manually or with AI:
```bash
# 1. Generate temporary scaffolding to see latest imports/patterns
up test generate temp-unit --language=kcl
up test generate temp-e2e --language=kcl --e2e

# 2. Compare/merge the imports and patterns into your actual tests
# 3. Delete the temp scaffolding (or leave it - it will be overwritten next time)
rm -rf tests/test-temp-unit tests/e2etest-temp-e2e
```

This creates:
- `tests/test-temp-unit/main.k` - Unit test template with imports
- `tests/e2etest-temp-e2e/main.k` - E2E test template with imports

### Understanding Generated Structure

Each test folder contains:
```
tests/test-<name>/
├── kcl.mod         # Package definition with model dependency
├── kcl.mod.lock    # Lock file (auto-generated)
├── main.k          # Test definitions
└── model -> ../../.up/kcl/models  # Symlink to generated models
```

The `kcl.mod` defines the model dependency:
```ini
[package]
name = "test-<name>"
version = "0.0.1"

[dependencies]
models = { path = "./model" }
```

### Available Model Imports

The scaffolding provides these standard imports:

```kcl
# XRD models (path follows reversed domain: aws.platform.example.com → com.example.platform.aws)
import models.com.example.platform.aws.v1alpha1 as awsv1alpha1

# Test framework types
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1  # CompositionTest, E2ETest
import models.io.upbound.dev.meta.v2alpha1 as metav2alpha1  # Project types

# Kubernetes types
import models.k8s.apimachinery.pkg.apis.meta.v1 as metav1   # ObjectMeta, etc.
```

**IMPORTANT:** The import path for your XRD follows the reversed API group. For `aws.platform.example.com/v1alpha1`, the import path is `models.com.example.platform.aws.v1alpha1`.

### Creating Your Actual Tests

After generating scaffolding to see the latest imports, create your real test:

```bash
# Create your actual test directory
mkdir -p tests/test-role-naming

# Copy the structure (or manually create)
cp tests/test-temp-unit/kcl.mod tests/test-role-naming/
ln -s ../../.up/kcl/models tests/test-role-naming/model

# Edit kcl.mod to update package name
# Then write your main.k with actual tests
```

Or simply rename the temp folder and update `kcl.mod`:
```bash
mv tests/test-temp-unit tests/test-role-naming
# Edit kcl.mod to change name = "test-role-naming"
```

## KCL Render Tests (Unit Tests)

Tests under `tests/` use KCL, run with `up test run tests/*`. KCL models are symlinked from `.up/kcl/models/` which are generated during `make build` or first render.

### Typed vs Untyped Test Definitions

**Prefer typed tests when possible.** The generated models provide type safety and IDE completion:

```kcl
import models.com.example.platform.aws.v1alpha1 as awsv1alpha1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1

_items = [
    metav1alpha1.CompositionTest {
        metadata.name = "test-role-prefix"
        spec = {
            compositionPath = "apis/ghaoidcs/composition.yaml"
            xrdPath = "apis/ghaoidcs/definition.yaml"
            timeoutSeconds = 60
            validate = False

            # Typed XR using generated schema
            xr = awsv1alpha1.GHAOIDC {
                metadata.name = "test-gha"
                spec = {
                    accountId = "123456789012"
                    github = {
                        orgOrUser = "my-org"
                    }
                    role = {
                        namePrefix = "custom-"
                    }
                }
            }

            # Partial assertions - only fields you're testing
            assertResources = [
                {
                    apiVersion = "iam.aws.m.upbound.io/v1beta1"
                    kind = "Role"
                    metadata.name = "custom-test-gha"  # Verify prefix applied
                }
            ]
        }
    }
]
items = _items
```

### Pass-Through Fields Limitation

KCL model generation doesn't support `x-kubernetes-preserve-unknown-fields: true`. Fields marked pass-through in the XRD won't appear in KCL schemas. For tests using pass-through fields, use untyped dicts instead of schema types:

```kcl
# Bad - KCL schema doesn't have pass-through fields
organizationalUnits: [
    {
        path: "Test"
        externalName: "ou-xxx"  # Error: field not in schema
    }
]

# Good - use untyped dict for items with pass-through fields
organizationalUnits: [
    {path: "Test", externalName: "ou-xxx"}
]
```

Or cast the entire spec to `any` to bypass schema validation entirely when the XRD uses extensive pass-through.

### Unit Test Philosophy

**render/validate checks provider API correctness.** Running `make render:all` and `make validate:all` already verifies that composed resources have valid schemas and field names. Unit tests that simply dump all rendered output and assert "it all rendered" add no value beyond what render/validate provides.

**Unit tests should validate YOUR API, not the provider's API.** Focus tests on verifying that your XRD's spec fields produce the expected behavior:

1. **Conditional rendering** - "When flag X is set, these resources should be rendered"
2. **Configuration mapping** - "When flag Y is set, this provider resource should be configured this way"
3. **Default values** - "When field Z is omitted, it defaults to this value"
4. **Edge cases** - "When both A and B are set, the interaction produces expected output"

**Prefer inline test fixtures over referencing examples/.** Define XR inputs directly in your test files rather than importing from `examples/`. This keeps tests self-contained and focused:

- `examples/` files serve render/validate and documentation purposes—they may change independently
- Inline fixtures make test intent clear: readers see exactly what input produces what output
- Each test can have a minimal fixture with only the fields relevant to that test case

### Complete Unit Test Example

```kcl
import models.com.example.platform.aws.v1alpha1 as awsv1alpha1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1
import models.k8s.apimachinery.pkg.apis.meta.v1 as metav1

_items = [
    # Test 1: Default role prefix is applied
    metav1alpha1.CompositionTest {
        metadata.name = "default-role-prefix"
        spec = {
            compositionPath = "apis/ghaoidcs/composition.yaml"
            xrdPath = "apis/ghaoidcs/definition.yaml"
            timeoutSeconds = 60
            validate = False
            xr = awsv1alpha1.GHAOIDC {
                metadata.name = "my-gha"
                spec = {
                    accountId = "123456789012"
                    github.orgOrUser = "my-org"
                }
            }
            assertResources = [
                {
                    apiVersion = "iam.aws.m.upbound.io/v1beta1"
                    kind = "Role"
                    metadata.name = "gha-my-gha"  # default prefix "gha-" + name
                }
            ]
        }
    }

    # Test 2: Custom role prefix overrides default
    metav1alpha1.CompositionTest {
        metadata.name = "custom-role-prefix"
        spec = {
            compositionPath = "apis/ghaoidcs/composition.yaml"
            xrdPath = "apis/ghaoidcs/definition.yaml"
            timeoutSeconds = 60
            validate = False
            xr = awsv1alpha1.GHAOIDC {
                metadata.name = "my-gha"
                spec = {
                    accountId = "123456789012"
                    github.orgOrUser = "my-org"
                    role.namePrefix = "deploy-"
                }
            }
            assertResources = [
                {
                    apiVersion = "iam.aws.m.upbound.io/v1beta1"
                    kind = "Role"
                    metadata.name = "deploy-my-gha"
                }
            ]
        }
    }

    # Test 3: Role name override takes precedence over prefix
    metav1alpha1.CompositionTest {
        metadata.name = "role-name-override"
        spec = {
            compositionPath = "apis/ghaoidcs/composition.yaml"
            xrdPath = "apis/ghaoidcs/definition.yaml"
            timeoutSeconds = 60
            validate = False
            xr = awsv1alpha1.GHAOIDC {
                metadata.name = "my-gha"
                spec = {
                    accountId = "123456789012"
                    github.orgOrUser = "my-org"
                    role = {
                        namePrefix = "ignored-"
                        nameOverride = "exact-role-name"
                    }
                }
            }
            assertResources = [
                {
                    apiVersion = "iam.aws.m.upbound.io/v1beta1"
                    kind = "Role"
                    metadata.name = "exact-role-name"
                }
            ]
        }
    }

    # Test 4: Trust policy subject pattern constructed correctly
    metav1alpha1.CompositionTest {
        metadata.name = "trust-policy-subject"
        spec = {
            compositionPath = "apis/ghaoidcs/composition.yaml"
            xrdPath = "apis/ghaoidcs/definition.yaml"
            timeoutSeconds = 60
            validate = False
            xr = awsv1alpha1.GHAOIDC {
                metadata.name = "prod-deploy"
                spec = {
                    accountId = "123456789012"
                    github = {
                        orgOrUser = "my-org"
                        repository = "infrastructure"
                        refPattern = "environment:production"
                    }
                }
            }
            # Verify status reflects the correct subject pattern
            assertResources = [
                {
                    apiVersion = "aws.platform.example.com/v1alpha1"
                    kind = "GHAOIDC"
                    status.trustPolicy.subject = "repo:my-org/infrastructure:environment:production"
                }
            ]
        }
    }
]
items = _items
```

### Testing Features That Gate on Observed Resources

For features that only render after dependencies are Ready (NAT after VPC, FlowLogs after VPC, etc.), provide inline `observedResources`:

```kcl
metav1alpha1.CompositionTest {
    metadata.name = "usage-renders-after-both-ready"
    spec = {
        compositionPath = "apis/ghaoidcs/composition.yaml"
        xrdPath = "apis/ghaoidcs/definition.yaml"
        timeoutSeconds = 60
        validate = False
        xr = awsv1alpha1.GHAOIDC {
            metadata.name = "test-gha"
            spec = {
                accountId = "123456789012"
                github.orgOrUser = "my-org"
            }
        }
        # Simulate both Role and PolicyAttachment being Ready
        observedResources = [
            {
                apiVersion = "iam.aws.m.upbound.io/v1beta1"
                kind = "Role"
                metadata = {
                    name = "gha-test-gha"
                    annotations = {"crossplane.io/composition-resource-name" = "role"}
                }
                status = {
                    conditions = [{type = "Ready", status = "True"}, {type = "Synced", status = "True"}]
                    atProvider = {arn = "arn:aws:iam::123456789012:role/gha-test-gha"}
                }
            }
            {
                apiVersion = "iam.aws.m.upbound.io/v1beta1"
                kind = "RolePolicyAttachment"
                metadata = {
                    name = "gha-test-gha-policy"
                    annotations = {"crossplane.io/composition-resource-name" = "policy-attachment"}
                }
                status = {
                    conditions = [{type = "Ready", status = "True"}, {type = "Synced", status = "True"}]
                    atProvider = {id = "gha-test-gha/arn:aws:iam::aws:policy/AdministratorAccess"}
                }
            }
        ]
        # Now Usage resource should render
        assertResources = [
            {
                apiVersion = "protection.crossplane.io/v1beta1"
                kind = "Usage"
                metadata.name = "test-gha-role-protects-attachment"
            }
        ]
    }
}
```

Key fields for observed resources:
- `metadata.annotations["crossplane.io/composition-resource-name"]` - must match the resource name annotation set in templates
- `status.conditions` - include `Ready: True` and `Synced: True`
- `status.atProvider` - include fields your templates extract (id, arn, etc.)

### What to Test

`assertResources` accepts partial manifests - only specify fields you're testing. Avoid full manifest snapshots.

**IMPORTANT: Always include `metadata.name` in assertions.** The test framework matches resources by apiVersion/kind/name. Without `metadata.name`, the assertion won't find any resource to match against.

```kcl
# WRONG - won't find resource
assertResources = [
    {
        apiVersion = "iam.aws.m.upbound.io/v1beta1"
        kind = "Role"
        spec.forProvider.permissionsBoundary = "arn:aws:iam::123456789012:policy/boundary"
    }
]

# CORRECT - includes metadata.name for matching
assertResources = [
    {
        apiVersion = "iam.aws.m.upbound.io/v1beta1"
        kind = "Role"
        metadata.name = "gha-bounded"  # Required for matching
        spec.forProvider.permissionsBoundary = "arn:aws:iam::123456789012:policy/boundary"
    }
]
```

Prefer verifying behavioral outputs:

- Default AWS tags merged onto resources
- Helm Release baseline values preserved
- Role prefixes honored in naming
- Trust policy subjects constructed correctly
- Conditional resources render/don't render based on flags

## E2E Tests

E2E tests live in `tests/e2etest-<xrd>/` with `main.k` defining `E2ETest`.

### Generating E2E Scaffolding

```bash
up test generate temp-e2e --language=kcl --e2e
```

This creates the E2E test template with the `E2ETest` type.

### E2E Test Structure

```kcl
import models.com.example.platform.aws.v1alpha1 as awsv1alpha1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1
import models.k8s.apimachinery.pkg.apis.meta.v1 as metav1

# Read AWS credentials from local file (add to .gitignore!)
_awsCreds = file.read("aws-creds")

# Generate unique name to avoid CI conflicts
_timestamp = datetime.now().unix
_testName = "e2e-ghaoidc-${_timestamp}"

_items = [
    metav1alpha1.E2ETest {
        metadata.name = "ghaoidc-e2e"
        spec = {
            crossplane.autoUpgrade.channel = "Rapid"
            defaultConditions = ["Ready"]
            skipDelete = False
            timeoutSeconds = 4500

            # Extra resources: secrets and provider configs
            extraResources = [
                # AWS credentials secret
                {
                    apiVersion = "v1"
                    kind = "Secret"
                    metadata = {
                        name = "aws-creds"
                        namespace = "crossplane-system"
                    }
                    type = "Opaque"
                    data.credentials = base64.encode(_awsCreds)
                }
                # Provider config
                {
                    apiVersion = "aws.upbound.io/v1beta1"
                    kind = "ProviderConfig"
                    metadata.name = "default"
                    spec = {
                        credentials = {
                            source = "Secret"
                            secretRef = {
                                name = "aws-creds"
                                namespace = "crossplane-system"
                                key = "credentials"
                            }
                        }
                    }
                }
            ]

            # The XR to test
            manifests = [
                awsv1alpha1.GHAOIDC {
                    metadata.name = _testName
                    spec = {
                        accountId = "123456789012"  # Use real account for E2E
                        github = {
                            orgOrUser = "my-org"
                            repository = "test-repo"
                        }
                    }
                }
            ]
        }
    }
]
items = _items
```

### Setup Requirements

- Read AWS credentials from local `aws-creds` file (INI format with `[default]` profile)
- Base64-encode credentials into a Secret via `extraResources`
- Provision ProviderConfig via `extraResources`
- Generate unique inputs per run (timestamped names) so CI jobs can coexist
- Keep `skipDelete: false` and generous `timeoutSeconds`
- Add `tests/e2etest-*/aws-creds` and `tests/**/secrets/` to `.gitignore`
- Run with `make e2e` → `up test run tests/e2etest* --e2e`

### E2E Tests with External Package Dependencies

When your XRD depends on resources from another configuration package (e.g., EKS cluster needs subnets from Network), use this pattern:

1. **`initResources`** - Install external Configuration packages before the test package
2. **`extraResources`** - Credentials and ProviderConfig only (not deleted during cleanup)
3. **`manifests`** - All XRs that need cleanup: dependency XRs AND the XR being tested

**IMPORTANT:** Resources in `manifests` are deleted during cleanup; resources in `extraResources` are not. Put all XRs (including dependencies like Network) in `manifests` to ensure proper cleanup.

**Key pattern:** Use label selectors instead of hardcoded IDs. The dependency XRD labels its resources, and your XRD uses selectors to find them.

```kcl
import base64
import file
import datetime
import math
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1
import models.com.example.platform.aws.v1alpha1 as awsv1alpha1

# Read AWS credentials from local file (gitignored)
_creds = file.read("secrets/aws-creds")
_base64_creds = base64.encode(_creds)

# Generate unique name using timestamp to avoid CI conflicts
_now = str(int(math.floor(datetime.ticks())))
_test_name = "e2e-myxrd-" + _now
_namespace = "default"
_region = "us-east-2"
_account_id = "123456789012"

_items = [
    metav1alpha1.E2ETest {
        metadata.name = "myxrd-with-network"
        spec = {
            crossplane = {
                version = "2.0.2-up.5"
                autoUpgrade.channel = "None"
            }
            defaultConditions = ["Ready"]
            timeoutSeconds = 5400  # 90 minutes
            cleanupTimeoutSeconds = 1800  # 30 minutes
            skipDelete = False

            # ==============================================================
            # initResources: Install external Configuration packages
            # Called BEFORE the test package is installed
            # ==============================================================
            initResources = [
                {
                    apiVersion = "pkg.crossplane.io/v1"
                    kind = "Configuration"
                    metadata.name = "aws-network"
                    spec.package = "ghcr.io/<your-org>/aws-network:v0.4.0"
                }
            ]

            # ==============================================================
            # extraResources: Credentials and ProviderConfig ONLY
            # These are NOT deleted during cleanup
            # ==============================================================
            extraResources = [
                # AWS credentials secret
                {
                    apiVersion = "v1"
                    kind = "Secret"
                    metadata = {
                        name = "aws-creds"
                        namespace = _namespace
                    }
                    data.creds = _base64_creds
                }
                # AWS ProviderConfig
                {
                    apiVersion = "aws.m.upbound.io/v1beta1"
                    kind = "ProviderConfig"
                    metadata = {
                        name = "default"
                        namespace = _namespace
                    }
                    spec.credentials = {
                        source = "Secret"
                        secretRef = {
                            namespace = _namespace
                            name = "aws-creds"
                            key = "creds"
                        }
                    }
                }
            ]

            # ==============================================================
            # manifests: ALL XRs that need cleanup (dependencies + test XR)
            # Resources here ARE deleted during cleanup
            # ==============================================================
            manifests = [
                # Dependency XR: Network (from aws-network package)
                # Creates VPC and subnets that MyXRD will reference
                {
                    apiVersion = "aws.platform.example.com/v1alpha1"
                    kind = "Network"
                    metadata = {
                        name = _test_name
                        namespace = _namespace
                    }
                    spec = {
                        region = _region
                        providerConfigRef = {
                            name = "default"
                            kind = "ProviderConfig"
                        }
                        tags = {
                            "e2etest" = "true"
                            "test-run" = _now
                        }
                        vpc.cidr = "10.200.0.0/16"
                        subnetLayout = {
                            availabilityZones = ["a", "b"]
                            public = {enabled = True, netmaskLength = 24}
                            private = {enabled = True, netmaskLength = 20}
                        }
                        nat.enabled = False  # Disable NAT to speed up test
                    }
                }
                # The XR being tested
                awsv1alpha1.MyXRD {
                    metadata = {
                        name = _test_name
                        namespace = _namespace
                    }
                    spec = {
                        region = _region
                        accountId = _account_id
                        # Reference Network's private subnets via labels
                        # Network automatically labels subnets with:
                        #   platform.example.com/network: <network-name>
                        #   platform.example.com/tier: private|public
                        subnetSelector = {
                            matchLabels = {
                                "platform.example.com/network" = _test_name
                                "platform.example.com/tier" = "private"
                            }
                        }
                        providerConfigRef = {
                            name = "default"
                            kind = "ProviderConfig"
                        }
                    }
                }
            ]
        }
    }
]
items = _items
```

**How this works:**

1. The test framework installs `aws-network` Configuration via `initResources`
2. After package install, `extraResources` creates credentials and ProviderConfig
3. `manifests` creates both Network and MyXRD - both will be cleaned up after the test
4. Network creates VPC and subnets, labeling them with `platform.example.com/network: <name>` and `platform.example.com/tier: private|public`
5. MyXRD uses `subnetSelector.matchLabels` to find the subnets
6. During cleanup, both XRs in `manifests` are deleted

**Benefits of this pattern:**
- **No hardcoded IDs** - Labels decouple the XRDs
- **Realistic testing** - Matches how users actually compose XRDs
- **Self-contained** - Test creates all dependencies, no pre-existing infrastructure needed
- **Proper cleanup** - All XRs in `manifests` are deleted, preventing resource leaks

**Common label patterns for cross-XRD references:**
- `platform.example.com/network: <name>` - Resources belonging to a Network XRD
- `platform.example.com/tier: private|public` - Subnet tier classification
- `platform.example.com/managed: "true"` - All platform-managed resources
- `platform.example.com/<kind>: <name>` - Generic pattern for any XRD kind

### E2E Tests with Prerequisite XRDs (Helm Charts)

When your Helm chart XRD requires another XRD to be installed and running first (e.g., OpenTelemetry Operator requires cert-manager), use this pattern:

1. **`initResources`** - Install the prerequisite Configuration package
2. **`extraResources`** - RBAC permissions and Helm ProviderConfig (not deleted during cleanup)
3. **`manifests`** - Both the prerequisite XR AND your XR being tested (both deleted during cleanup)

**Example: OpenTelemetry Operator requiring cert-manager**

```kcl
import datetime
import math
import models.com.example.platform.helm.v1alpha1 as helmv1alpha1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1

_now = str(int(math.floor(datetime.ticks())))
_test_name = "e2e-otel-" + _now

_items = [
    metav1alpha1.E2ETest {
        metadata.name = "opentelemetryoperator-helm"
        spec = {
            crossplane = {
                autoUpgrade.channel = "Rapid"
            }
            defaultConditions = ["Ready"]
            timeoutSeconds = 1800  # 30 minutes
            cleanupTimeoutSeconds = 1800
            skipDelete = False

            # ==============================================================
            # initResources: Install prerequisite Configuration packages
            # These are NOT deleted during cleanup
            # ==============================================================
            initResources = [
                # cert-manager Configuration - required by OpenTelemetry Operator
                {
                    apiVersion = "pkg.crossplane.io/v1"
                    kind = "Configuration"
                    metadata.name = "helm-cert-manager"
                    spec = {
                        package = "ghcr.io/<your-org>/helm-cert-manager:v0.6.1"
                    }
                }
            ]

            # ==============================================================
            # extraResources: RBAC and Helm ProviderConfig
            # These are NOT deleted during cleanup
            # ==============================================================
            extraResources = [
                # Grant cluster-admin to all SAs in crossplane-system namespace
                # Required for Helm provider to create namespaces and install charts
                {
                    apiVersion = "rbac.authorization.k8s.io/v1"
                    kind = "ClusterRoleBinding"
                    metadata.name = "crossplane-system-cluster-admin"
                    roleRef = {
                        apiGroup = "rbac.authorization.k8s.io"
                        kind = "ClusterRole"
                        name = "cluster-admin"
                    }
                    subjects = [
                        {
                            kind = "Group"
                            name = "system:serviceaccounts:crossplane-system"
                            apiGroup = "rbac.authorization.k8s.io"
                        }
                    ]
                }
                # Helm ProviderConfig - uses in-cluster identity (InjectedIdentity)
                {
                    apiVersion = "helm.m.crossplane.io/v1beta1"
                    kind = "ProviderConfig"
                    metadata = {
                        name = "default"
                        namespace = "default"
                    }
                    spec = {
                        credentials = {
                            source = "InjectedIdentity"
                        }
                    }
                }
            ]

            # ==============================================================
            # manifests: Prerequisite XR AND the XR being tested
            # Resources here ARE deleted during cleanup
            # ==============================================================
            manifests = [
                # Prerequisite: CertManager must be installed first
                {
                    apiVersion = "helm.platform.example.com/v1alpha1"
                    kind = "CertManager"
                    metadata = {
                        name = "cert-manager"
                        namespace = "default"
                    }
                    spec = {
                        clusterName = "cert-manager"
                        providerConfigRef = {
                            name = "default"
                            kind = "ProviderConfig"
                        }
                    }
                }
                # The XR being tested
                helmv1alpha1.OpenTelemetryOperator {
                    metadata = {
                        name = _test_name
                        namespace = "default"
                    }
                    spec = {
                        clusterName = _test_name
                        labels = {
                            "platform.example.com/e2etest" = "true"
                            "platform.example.com/test-run" = _now
                        }
                        providerConfigRef = {
                            name = "default"
                            kind = "ProviderConfig"
                        }
                        # Minimal resource requests for kind cluster
                        values = {
                            manager.resources.requests = {cpu = "10m", memory = "32Mi"}
                            kubeRBACProxy.resources.requests = {cpu = "10m", memory = "32Mi"}
                        }
                    }
                }
            ]
        }
    }
]
items = _items
```

**Key points:**
- The prerequisite Configuration package is installed via `initResources` with a pinned version
- Both CertManager XR and OpenTelemetryOperator XR are in `manifests` so both get cleaned up
- The RBAC ClusterRoleBinding in `extraResources` grants necessary permissions for Helm to create namespaces
- Use minimal resource requests in `values` to fit within kind cluster limits
- The prerequisite XR uses a simple, stable name ("cert-manager") while the test XR uses a timestamped name

**When to use this pattern:**
- Helm operators that require cert-manager (OpenTelemetry Operator, many CRD-based operators)
- Charts that require Istio, Prometheus, or other infrastructure
- Any chart that has a runtime dependency on another chart

### AWS Credentials File Format

Create `tests/e2etest-<name>/aws-creds` (gitignored):

```ini
[default]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
```

## Running Tests

```bash
# Run all unit tests
make test
# or directly:
up test run tests/test-*

# Run all E2E tests
make e2e
# or directly:
up test run tests/e2etest-* --e2e

# Run specific test
up test run tests/test-role-naming
```

## Direct CLI Usage

```bash
up composition render --xrd=apis/<plural>/definition.yaml \
  apis/<plural>/composition.yaml \
  examples/<plural>/standard.yaml \
  --observed-resources=examples/test/mocks/observed-resources/standard/steps/1/
```

## Examples Synchronization

The `EXAMPLES` variable in the Makefile uses format `example_path::observed_resources_path` (observed path optional):

```makefile
# Examples list - mirrors GitHub Actions workflow
# Format: example_path::observed_resources_path (observed_resources_path is optional)
EXAMPLES := \
    examples/irsas/minimal.yaml:: \
    examples/irsas/standard.yaml::examples/test/mocks/observed-resources/standard/steps/1/ \
    examples/irsas/standard.yaml::examples/test/mocks/observed-resources/standard/steps/2/
```

Corresponding GitHub Actions workflow input (JSON objects with `example` and optional `observed_resources`):

```yaml
validate:
  uses: unbounded-tech/workflows-crossplane/.github/workflows/validate.yaml@v2.13.0
  with:
    examples: |
      [
        { "example": "examples/irsas/minimal.yaml" },
        { "example": "examples/irsas/standard.yaml", "observed_resources": "examples/test/mocks/observed-resources/standard/steps/1/" },
        { "example": "examples/irsas/standard.yaml", "observed_resources": "examples/test/mocks/observed-resources/standard/steps/2/" }
      ]
```

When adding new examples, update both the Makefile `EXAMPLES` list and the workflow `examples` input to keep local development and CI in sync.

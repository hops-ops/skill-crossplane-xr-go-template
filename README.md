# skill-crossplane-xr-go-template

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skill for authoring Crossplane Composite Resources (XRs) using Go templates ([function-go-templating](https://github.com/crossplane-contrib/function-go-templating)).

## What this skill does

When active, Claude Code gains deep knowledge of Crossplane XRD authoring patterns including:

- **XRD schema design** - Configuration schema patterns, Crossplane 2.0 conventions
- **Go template patterns** - State management, observed resources, template structure
- **Labels & tags** - Consistent labeling across Kubernetes and cloud resources
- **Testing** - KCL unit tests, E2E test setup, observed resource mocks
- **CI/CD** - GitHub Actions workflows, Renovate config, GitOps packaging
- **Deletion protection** - Usage resources for safe resource lifecycle
- **Resource import** - External name support for adopting existing infrastructure

## Installation

### Global (all projects)

```bash
# Clone into your global Claude Code skills directory
git clone https://github.com/hops-ops/skill-crossplane-xr-go-template.git ~/.claude/skills/crossplane-xr-go-template
```

### Per-project

```bash
# Clone into your project's .claude/skills directory
git clone https://github.com/hops-ops/skill-crossplane-xr-go-template.git .claude/skills/crossplane-xr-go-template
```

Or add as a git submodule:

```bash
git submodule add https://github.com/hops-ops/skill-crossplane-xr-go-template.git .claude/skills/crossplane-xr-go-template
```

## Customization

The skill uses `platform.example.com` as an example API group domain throughout. See the **Customization** section in [SKILL.md](.claude/skills/crossplane-xr-go-template/SKILL.md) for what to replace with your own values.

## Usage

Once installed, Claude Code will automatically use this skill when working on Crossplane XR/XRD projects. You can also invoke it explicitly:

```
/crossplane-xr-go-template
```

## Structure

```
.claude/skills/crossplane-xr-go-template/
├── SKILL.md                          # Main skill index and patterns
└── references/
    ├── helm-xrd-pattern.md           # Helm-only XRD patterns
    ├── template-structure.md         # Template file organization
    ├── observed-state-pattern.md     # $observed/$state namespace
    ├── template-patterns.md          # forProvider, multi-provider patterns
    ├── template-simplification.md    # Reducing template duplication
    ├── status-output.md              # XRD status design
    ├── labels-pattern.md             # Labels and tags conventions
    ├── external-names.md             # Resource import support
    ├── usages.md                     # Deletion protection patterns
    ├── gitops-package.md             # GitOps deployment setup
    ├── observed-resources.md         # Test mock creation
    ├── testing.md                    # KCL and E2E testing
    ├── makefile-template.md          # Makefile targets
    ├── github-workflows.md           # CI workflow templates
    ├── renovate-config.md            # Dependency automation
    └── readme-structure.md           # README documentation structure
```

## License

MIT

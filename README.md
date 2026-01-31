# skill-hops-xr-got-guidance

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) multi-agent skill system for authoring Crossplane Composite Resources (XRs) using Go templates ([function-go-templating](https://github.com/crossplane-contrib/function-go-templating)).

## What this skill does

When active, Claude Code gains deep knowledge of Crossplane XRD authoring patterns through a multi-agent system:

- **`hops-xr-orchestrator`** agent coordinates work and delegates to specialists
- **`hops-xr-core`** skill provides foundational knowledge loaded by every agent
- **16 specialist agents**, each backed by a dedicated skill
- **6 slash commands** for common workflows

### Getting Started

The recommended entry point for all Crossplane work is:

```
/hops-crossplane
```

This command walks you through platform setup (GitHub org, API group, registry, providers), persists the config in `hops-crossplane.yaml`, and routes you to the right workflow. The config values flow into all sub-commands so you never have to manually replace placeholder defaults.

### Slash Commands

| Command | What it does |
|---------|-------------|
| `/hops-crossplane` | **Start here** — Platform setup, config persistence, and workflow router |
| `/hops-xr-new` | Scaffold a new XRD from scratch, walking through all workflow phases |
| `/hops-xr-validate` | Run `make render:all`, `validate:all`, and `test` — report results |
| `/hops-xr-checklist` | Run the completion checklist against the project, report done vs missing |
| `/hops-xr-got-simplify` | Audit templates for simplification opportunities, diff before/after |
| `/hops-xr-audit` | Deep quality audit — delegates each domain to its specialist agent |

### Specialist Agents

| Agent | Domain |
|-------|--------|
| `hops-xr-got-template-structure` | Template file organization, $state namespace, reconciliation loop |
| `hops-xr-got-observed-state` | Observed resource values, spec defaults, state-init/compute |
| `hops-xr-got-template-patterns` | forProvider pass-through, Helm values, Kubernetes Object, multi-provider |
| `hops-xr-got-status-output` | XRD status design, anti-corruption layer, observed value exposure |
| `hops-xr-labels` | Labels and tags across Kubernetes and cloud resources |
| `hops-xr-external-names` | Resource import via crossplane.io/external-name |
| `hops-xr-usages` | Deletion protection with Usage resources |
| `hops-xr-got-template-simplification` | Reducing template duplication and complexity |
| `hops-xr-got-helm-pattern` | Helm-only XRD pattern, flat schema, InjectedIdentity |
| `hops-xr-testing` | KCL unit tests, E2E tests, test scaffolding |
| `hops-xr-observed-resources` | Test mock creation from real cluster state |
| `hops-xr-makefile` | Makefile targets for render, validate, test, build |
| `hops-xr-github-workflows` | GitHub Actions CI/CD, OIDC auth, E2E jobs |
| `hops-xr-renovate` | Renovate config for Crossplane dependency automation |
| `hops-xr-gitops-package` | GitOps deployment packages, Helm chart wrapper |
| `hops-xr-readme` | README documentation structure, journey-based stages |

### Workflow Phases

When building a new XRD from scratch, agents are invoked in this order:

1. **Schema & Structure**: `hops-xr-got-template-structure` → `hops-xr-got-observed-state` → `hops-xr-got-template-patterns`
2. **Cross-Cutting**: `hops-xr-labels` → `hops-xr-got-status-output` → `hops-xr-external-names` → `hops-xr-usages`
3. **Refinement**: `hops-xr-got-template-simplification`
4. **Testing**: `hops-xr-observed-resources` → `hops-xr-testing`
5. **Build & CI**: `hops-xr-makefile` → `hops-xr-github-workflows` → `hops-xr-renovate`
6. **Packaging & Docs**: `hops-xr-gitops-package` → `hops-xr-readme`

The `hops-xr-got-helm-pattern` agent serves as an alternative entry point for Helm-only XRDs.

## Installation

### npm (recommended)

```bash
# Global — available in all projects
npm install -g @hops-ops/skill-hops-xr-got-guidance

# Per-project — available only in this project
npm install --save-dev @hops-ops/skill-hops-xr-got-guidance
```

### Shell script

```bash
# Clone and install globally
git clone https://github.com/hops-ops/skill-hops-xr-got-guidance.git
cd skill-hops-xr-got-guidance
./install.sh

# Or install to current project
./install.sh --local
```

### Manual

Copy the `skills/`, `agents/`, and `commands/` directories into `~/.claude/` (global) or your project's `.claude/` directory.

## Usage

Once installed, run `/hops-crossplane` to configure your platform settings (GitHub org, API group domain, registry, providers). This creates a `hops-crossplane.yaml` in your project root that all agents use for concrete values instead of placeholders.

```
/hops-crossplane
```

From there, the command routes you to the appropriate workflow. You can also invoke sub-commands directly:

```
/hops-xr-new
/hops-xr-validate
/hops-xr-checklist
/hops-xr-got-simplify
/hops-xr-audit
```

Claude Code will also automatically delegate to the appropriate specialist agent when working on Crossplane XR/XRD projects.

## Structure

```
skills/                                     # 18 skill definitions
├── hops-xr-got-guidance/
│   └── SKILL.md                            # Entry point skill
├── hops-xr-core/
│   └── SKILL.md                            # Core foundational knowledge (loaded by all agents)
├── hops-xr-got-template-structure/
│   └── SKILL.md                            # Template file organization
├── hops-xr-got-observed-state/
│   └── SKILL.md                            # $observed/$state namespace
├── hops-xr-got-template-patterns/
│   └── SKILL.md                            # forProvider, multi-provider patterns
├── hops-xr-got-status-output/
│   └── SKILL.md                            # XRD status design
├── hops-xr-labels/
│   └── SKILL.md                            # Labels and tags conventions
├── hops-xr-external-names/
│   └── SKILL.md                            # Resource import support
├── hops-xr-usages/
│   └── SKILL.md                            # Deletion protection patterns
├── hops-xr-got-template-simplification/
│   └── SKILL.md                            # Reducing template duplication
├── hops-xr-got-helm-pattern/
│   └── SKILL.md                            # Helm-only XRD patterns
├── hops-xr-testing/
│   └── SKILL.md                            # KCL and E2E testing
├── hops-xr-observed-resources/
│   └── SKILL.md                            # Test mock creation
├── hops-xr-makefile/
│   └── SKILL.md                            # Makefile targets
├── hops-xr-github-workflows/
│   └── SKILL.md                            # CI workflow templates
├── hops-xr-renovate/
│   └── SKILL.md                            # Dependency automation
├── hops-xr-gitops-package/
│   └── SKILL.md                            # GitOps deployment setup
└── hops-xr-readme/
    └── SKILL.md                            # README documentation structure

agents/                                     # Orchestrator + 16 specialist agents
├── hops-xr-orchestrator.md                      # Coordinates work across all agents
├── hops-xr-got-template-structure.md
├── hops-xr-got-observed-state.md
├── hops-xr-got-template-patterns.md
├── hops-xr-got-status-output.md
├── hops-xr-labels.md
├── hops-xr-external-names.md
├── hops-xr-usages.md
├── hops-xr-got-template-simplification.md
├── hops-xr-got-helm-pattern.md
├── hops-xr-testing.md
├── hops-xr-observed-resources.md
├── hops-xr-makefile.md
├── hops-xr-github-workflows.md
├── hops-xr-renovate.md
├── hops-xr-gitops-package.md
└── hops-xr-readme.md

commands/                                   # Slash commands
├── hops-crossplane.md                           # /hops-crossplane (entry point)
├── hops-xr-new.md                               # /hops-xr-new
├── hops-xr-validate.md                          # /hops-xr-validate
├── hops-xr-checklist.md                         # /hops-xr-checklist
├── hops-xr-got-simplify.md                      # /hops-xr-got-simplify
└── hops-xr-audit.md                             # /hops-xr-audit
```

## License

MIT

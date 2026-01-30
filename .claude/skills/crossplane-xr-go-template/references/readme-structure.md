# README Documentation Structure

Each XRD configuration must have a README.md that explains:
1. What resources are composed and why they're grouped together
2. The problem this XRD solves (without vs with)
3. Progressive usage patterns from simple to complex
4. Status fields and how to use them downstream

## Structure Template

```markdown
# <name>

One-line description of what this provides and the problem it solves.

## Why <Resource>?

**Without <Resource>:**
- Pain point 1
- Pain point 2
- Pain point 3

**With <Resource>:**
- Benefit 1
- Benefit 2
- Benefit 3

## The Journey

### Stage 1: Getting Started (Individual)

Minimal viable configuration for a single account/project.

**Why start here?**
- Reason this foundation matters even for small scale
- Future-proofing benefit
- No migration pain later

[Example YAML for simplest use case]

### Stage 2: Growing (Small Org)

Add features as complexity grows - multiple environments, teams, or regions.

**Why expand?**
- Trigger for needing this stage
- Benefits unlocked

[Example YAML with additional features enabled]

### Stage 3: Enterprise Scale

Full-featured configuration for large organizations.

**Why this matters at scale?**
- Compliance/governance requirements
- Multi-region/multi-account patterns
- Integration with organizational structure

[Example YAML with enterprise features]

### Stage 4: Import Existing (Optional)

How to bring existing resources under management.

**Why import?**
- Preserve existing infrastructure
- Gradual adoption path
- No disruption to running workloads

[Example YAML with externalName and managementPolicies]

## Using <Resource>

How to reference outputs from this XRD in other resources or XRDs.

[Example showing status field usage in downstream resources]

## Status

Document the status fields exposed and what each contains.

## Composed Resources

List of AWS/cloud resources this XRD creates:
- `ResourceKind` - Purpose and when it's created
- `ResourceKind` - Purpose and when it's created

## Development

make render/test/validate/e2e commands

## License

Apache-2.0
```

## Research Best Practices

For each XRD, research AWS/cloud best practices and document how the XRD encapsulates them:

**Individual stage** - What's the simplest setup that's still production-ready? What defaults make sense for someone just starting?

**Small org stage** - What do teams need when they have 2-10 developers? Multiple environments? How does the XRD help avoid common mistakes at this scale?

**Enterprise stage** - What compliance, governance, and scale requirements exist? How does the XRD address:
- Multi-region deployments
- Multi-account strategies (AWS Organizations)
- Audit and compliance requirements
- Integration with identity providers
- Cost allocation and tagging strategies
- Disaster recovery patterns

**Example research questions for aws-ipam:**
- AWS recommends IPAM for any multi-VPC environment - document why
- IPv6 adoption best practices - dual-stack vs IPv6-only
- Regional pool hierarchies for compliance (data residency)
- RAM sharing patterns for cross-account allocation

The README should be educational - someone reading it should understand not just *how* to use the XRD but *why* the patterns exist.

To research and write documentation, invoke the content-research-writer skill.

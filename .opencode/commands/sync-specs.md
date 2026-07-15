---
description: Synchronize specification files with the current implementation, treating the codebase as the source of truth and updating documentation to match.
agent: build
---

# Sync Specs from Code

Synchronize specification files with the current implementation.

Treat the codebase as the sole source of truth.

## Instructions

- Inspect the implementation before reading specifications.
- Identify implemented features, removed features, renamed components, public interfaces, configuration, runtime behavior, dependencies, and architectural boundaries.
- Compare the implementation against all specification documents and identify any mismatches, including:
  - Undocumented functionality
  - Obsolete documentation
  - Incorrect API descriptions
  - Stale examples
  - Outdated workflows
  - Invalid diagrams
  - Removed modules
  - Incorrect configuration
- Update the specifications to accurately reflect the implementation.
- Preserve document structure, formatting, headings, links, rationale, design decisions, and non-functional requirements whenever possible.
- Prefer minimal, targeted edits over full rewrites.
- Update examples, API contracts, architecture descriptions, module responsibilities, configuration, CLI usage, workflows, and limitations to match the current implementation.
- Remove documentation for functionality that no longer exists, obsolete TODOs, outdated migration notes, speculative statements, and references to deleted components.
- Never modify the implementation to satisfy outdated documentation.
- Never invent undocumented behavior or describe planned features as implemented.
- If the implementation is ambiguous or conflicting, do not guess. Report the uncertainty and identify the relevant locations requiring human review.
- Before finishing, verify that every documented feature, API, configuration option, workflow, and example is supported by the current implementation.

## Output

Return:

1. A summary of the specifications updated.
2. The mismatches that were corrected.
3. Any unresolved ambiguities requiring review.
4. A per-file summary of the changes made.

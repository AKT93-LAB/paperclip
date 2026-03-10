# Universal Approval-First Operating Model

This document defines the default Paperclip control model for agent-run projects.

## Goal

Make Paperclip useful across many project types without reinventing workflow rules every time.

The system should support:
- autonomous agent work
- reviewable artifacts
- explicit human control at decision boundaries
- safe gating of external side effects

## Core principle

Agents should be autonomous in **exploration** and **production preparation**.
Humans should stay in control of **direction**, **final deliverables**, and **execution with side effects**.

In short:
- autonomous in the work
- human-gated in commitment and release

## The four phases of work

Every project should be understandable as a flow across these phases:

1. **Exploration**
   - research
   - analysis
   - option generation
   - internal debate
   - collecting evidence

2. **Direction**
   - selecting a strategy
   - prioritizing work
   - choosing a recommended path
   - defining success criteria

3. **Production**
   - creating drafts
   - building artifacts
   - preparing deliverables
   - packaging work for review

4. **Execution**
   - publishing
   - deploying
   - sending
   - changing external state
   - destructive actions

## Universal approval gates

### Gate 1 — Direction approval
Use when the team wants to lock a strategy, choose among options, or commit to a major path.

Typical approval contents:
- objective
- options considered
- recommended option
- rationale
- risks
- success metrics

Good examples:
- approve content strategy
- approve GTM plan
- approve product direction
- approve migration plan

### Gate 2 — Artifact approval
Use when the team has produced concrete deliverables that need human review before release or implementation.

Typical approval contents:
- draft artifacts
- summary of what was produced
- known weaknesses
- recommendation on whether to proceed

Good examples:
- approve video package
- approve design draft
- approve spec document
- approve email draft
- approve implementation bundle

### Gate 3 — Execution approval
Use before any external action or destructive change.

Typical approval contents:
- exact action to be taken
- target or destination
- final artifacts/payloads
- expected side effects
- rollback or recovery notes if relevant

Good examples:
- publish social post
- send outbound email
- deploy build
- trigger webhook
- delete records
- modify external account configuration

## Default autonomy policy

### Agents may proceed autonomously for:
- research
- brainstorming
- scoring and ranking options
- drafting
- internal comments
- packaging artifacts for review
- retrospectives and analysis

### Human approval is required for:
- strategic commitment
- final high-value deliverables
- external or public actions
- destructive actions
- risky, expensive, legal, compliance, or brand-sensitive actions

## Artifact model

Every approval should support a reusable `artifacts[]` array.

Suggested shape:

```json
{
  "artifacts": [
    {
      "assetId": "...",
      "label": "Human-readable label",
      "kind": "video",
      "role": "primary",
      "summary": "Optional context"
    }
  ]
}
```

### Artifact rules
- `assetId` points to the stored asset
- `label` is the human-facing name
- `kind` describes what it is (video, image, text, report, data, etc.)
- `role` describes why it matters (primary, supporting, evidence, reference, preview)
- `summary` provides concise review context

### Why this matters
This keeps Paperclip generic. TikTok, docs, product specs, and deploy plans can all use the same review surface.

## Standard approval types

Paperclip should converge on these approval categories as the default org grammar:

1. `direction_approval`
   - approve plan or strategy
2. `artifact_approval`
   - approve a deliverable package
3. `execution_approval`
   - approve an external/destructive action

### Current compatibility note
If the current product surface still uses `human_decision` and `action_execution`, map them as follows:
- `human_decision` → direction approval or artifact approval depending on payload
- `action_execution` → execution approval

## Human inbox model

The inbox should feel consistent across all projects.

A healthy default sequence is:
1. **Approve direction**
2. **Approve artifact package**
3. **Approve execution**

The human should not have to learn a new mental model for every project.

## Escalation triggers

Require approval immediately if any of these are true:
- external/public action
- money/resources are spent
- destructive change is proposed
- legal/compliance risk exists
- brand risk exists
- the team wants to shift strategy materially

## Project template guidance

Every new project should define:
- objective
- success metrics
- approval map
- artifact contract
- weekly review loop

Suggested starter issues:
1. define objective + metrics
2. define approval map
3. define artifact contract
4. create first reviewable work package
5. define weekly learning loop

## Example: TikTok project

TikTok is only an example of the universal model.

- direction approval: audience, pillars, growth hypotheses, candidate concepts
- artifact approval: scripts, captions, video package
- execution approval: publish final post

The same exact structure should also work for product launch, software delivery, sales ops, or research.

## Anti-patterns to avoid

- asking for approval at every tiny step
- allowing external execution without explicit approval
- using project-specific one-off payload shapes for artifacts
- making the human parse raw UUID soup instead of labeled artifacts
- mixing strategy, artifact review, and execution into one muddy approval

## What good looks like

A strong Paperclip project should let agents do meaningful autonomous work while making the human review experience simple:
- clear decisions
- clear artifacts
- clear actions
- clear risk boundaries

That is the operating system.

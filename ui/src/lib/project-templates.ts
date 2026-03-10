export type ProjectTemplateIssue = {
  title: string;
  description: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "backlog" | "todo" | "in_progress" | "blocked" | "review" | "done" | "cancelled";
};

export type ProjectTemplate = {
  id: string;
  name: string;
  summary: string;
  projectName: string;
  status: "backlog" | "planned" | "in_progress" | "completed" | "cancelled";
  description: string;
  starterIssues: ProjectTemplateIssue[];
};

const universalDescription = `# Approval-first project operating model

This project follows the Paperclip universal operating model:

## Core principle
Agents are autonomous in **exploration** and **production prep**, but humans stay in control at **decision boundaries** and before **external side effects**.

## Four operating phases
1. **Exploration** — research, analysis, option generation, internal debate
2. **Direction** — choose the plan, priorities, and success criteria
3. **Production** — create drafts, artifacts, implementation packages
4. **Execution** — publish, deploy, send, or otherwise change external state

## Required approval gates
### Gate 1 — Direction approval
Use when the team is choosing a strategy, making a major tradeoff, or locking a plan.

### Gate 2 — Artifact approval
Use when the team has concrete deliverables ready for human review before release or implementation.

### Gate 3 — Execution approval
Use before any external/public action or destructive change.

## Default autonomy policy
Agents may proceed without human approval for:
- research
- ideation
- scoring/ranking
- draft preparation
- internal coordination
- analytics and retrospectives

Agents must request approval for:
- strategic commitment
- final deliverables that matter
- external actions
- risky, expensive, destructive, or brand-sensitive actions

## Success criteria for this project
- the objective is clearly defined
- approval gates are explicit
- artifacts are reviewable in approvals
- execution is blocked until approval
- weekly learning loop captures what worked and what failed
`;

const universalStarterIssues: ProjectTemplateIssue[] = [
  {
    title: "Define project objective, constraints, and success metrics",
    priority: "high",
    description: `Create the first direction package for this project.

Deliverables:
- problem statement
- target outcome
- explicit success metrics
- key constraints and non-goals
- recommended operating cadence

Approval gate:
- create a **human_decision** approval for direction lock before downstream production begins.`,
  },
  {
    title: "Design approval map for this project",
    priority: "high",
    description: `Translate the universal Paperclip doctrine into this project's concrete control points.

Deliverables:
- which decisions require approval
- which artifacts require approval
- which actions require execution approval
- what agents may do autonomously
- escalation triggers for risk, spend, or external side effects`,
  },
  {
    title: "Set up artifact package contract",
    priority: "medium",
    description: `Define the artifacts[] payload shape this project will use for reviewable work.

Deliverables:
- artifact roles (primary / supporting / evidence / reference)
- artifact kinds (doc / text / image / video / data / report)
- naming/labeling conventions
- examples of approval payloads using artifacts[]`,
  },
  {
    title: "Create first reviewable work package",
    priority: "medium",
    description: `Produce the first artifact package for this project and send it through the new approval flow.

Goal:
- prove that the project can move from plan → artifacts → approval → next step without losing human oversight.`,
  },
  {
    title: "Create weekly learning loop",
    priority: "medium",
    description: `Define how the project will review outcomes and improve.

Deliverables:
- weekly review cadence
- metrics to inspect
- template for lessons learned
- process for turning insights into next-step issues`,
  },
];

const tiktokDescription = `# TikTok growth experiment

This project uses the universal Paperclip approval model to run a TikTok growth workflow without turning the org into approval sludge.

## Goal
Build an approval-first operating loop for a TikTok account that can move from idea → concept approval → production → publish approval → performance review.

## Human approval gates
### Gate 1 — Direction approval
Approve:
- audience
- content pillars
- growth hypotheses
- first batch of candidate concepts

### Gate 2 — Artifact approval
Approve:
- shortlisted scripts
- captions
- visual plans
- final creative package

### Gate 3 — Execution approval
Approve:
- actual publish action
- destination account
- final asset package and checklist

## Autonomous work
Agents can autonomously:
- research competitors and trends
- generate and score ideas
- draft scripts and captions
- package review artifacts
- analyze results and propose next experiments

## Success criteria
- first 20 ideas generated
- first 3 concepts approved for production
- first 3 final post packages ready for approval
- post-performance review loop defined
`;

const tiktokStarterIssues: ProjectTemplateIssue[] = [
  {
    title: "Define TikTok account strategy and success metrics",
    priority: "high",
    description: `Build the initial strategy memo.

Deliverables:
- target audience
- account promise / positioning
- 3–5 content pillars
- posting cadence
- growth hypotheses
- success metrics for first 30 days

Approval gate:
- create a **human_decision** approval before content production starts.`,
  },
  {
    title: "Generate and rank first 20 content ideas",
    priority: "high",
    description: `Research trends, relevant formats, and competitive patterns, then generate 20 candidate ideas.

Deliverables:
- idea list
- pillar mapping
- ranking rationale
- recommended top 5 concepts`,
  },
  {
    title: "Prepare concept approval pack for first 3 posts",
    priority: "high",
    description: `Convert the best ideas into a reviewable concept pack.

Deliverables:
- hook options
- angle summary
- rough script or post structure
- why each concept should perform

Approval gate:
- human chooses which 3 concepts move to production.`,
  },
  {
    title: "Produce first final artifact package",
    priority: "medium",
    description: `Create the first end-to-end reviewable content package.

Deliverables:
- final video or preview artifact
- caption draft
- posting checklist
- any supporting evidence artifacts

Approval gate:
- create final artifact/execution approval before publishing.`,
  },
  {
    title: "Create post-performance review template",
    priority: "medium",
    description: `Define the weekly review loop.

Deliverables:
- what to review at 24h and 7d
- retention / saves / shares / profile visits / conversions
- how to turn results into next experiments`,
  },
];

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "universal-approval-os",
    name: "Universal approval-first project",
    summary: "Reusable operating model for any agent project: direction, artifact, and execution gates.",
    projectName: "Approval-first Project OS",
    status: "planned",
    description: universalDescription,
    starterIssues: universalStarterIssues,
  },
  {
    id: "tiktok-growth-experiment",
    name: "TikTok growth experiment",
    summary: "Example instantiation of the universal model for idea → production → publish → review.",
    projectName: "TikTok Growth Engine",
    status: "planned",
    description: tiktokDescription,
    starterIssues: tiktokStarterIssues,
  },
];

export function getProjectTemplateById(id: string | null | undefined): ProjectTemplate | null {
  if (!id) return null;
  return PROJECT_TEMPLATES.find((template) => template.id === id) ?? null;
}

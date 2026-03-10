# Paperclip Session Handoff — 2026-03-10

This repo-local handoff summarizes the current branch state, the Paperclip agent runtime decisions, and what to do next.

## Branch
- `nova/approval-artifact-ux`

## Product priorities to preserve
Do not degrade these:
- human approval inbox flow
- action execution approvals
- human decision approvals
- approval artifacts with inline previews
- structured approval decisions
- artifact labeling / human-readable artifact UX

## What was implemented this session

### UI / product
- Added universal project templates and approval doctrine
- Improved new-project template UX to avoid dumping giant template text into description fields

Files:
- `ui/src/lib/project-templates.ts`
- `ui/src/components/NewProjectDialog.tsx`
- `docs/UNIVERSAL_APPROVAL_MODEL.md`

### Autonomy infrastructure
#### 1. Prevent self-comment wake loops
Commit:
- `8b2d4a1` — Prevent self-wakeup loops on agent issue comments

Files:
- `server/src/routes/issues.ts`
- `server/src/routes/issues-comment-wakeup.ts`
- `server/src/__tests__/issues-comment-wakeup.test.ts`

#### 2. Treat OpenClaw no-reply as failure
Commit:
- `d17f768` — Treat OpenClaw no-reply responses as failures

Files:
- `packages/adapters/openclaw/src/server/execute.ts`
- `server/src/__tests__/openclaw-adapter.test.ts`

#### 3. Auto-retry issue runs after no-reply
Commit:
- `2f6acea` — Auto-retry issue runs after OpenClaw no-reply

Files:
- `server/src/services/heartbeat.ts`
- `server/src/__tests__/heartbeat-no-reply-recovery.test.ts`

## Paperclip agent config policy
Anton explicitly wants:
- all **Paperclip agents** on **MiniMax-M2.5** with **high thinking** during current testing
- do not silently switch them to GPT-5.4

This policy was briefly violated during debugging and then reverted.

### Current explicit per-agent Paperclip config
All Paperclip agents were updated so they now explicitly use MiniMax rather than fuzzy `openclaw:main` inheritance.

Applied at agent level:
- `adapter_config.model = "minimax"`
- `adapter_config.payloadTemplate.model = "minimax"`
- per-agent `timeoutSec`
- per-agent `payloadTemplate.max_output_tokens`

Added to `runtime_config.routing`:
- `profile`
- `targetModel = minimax/MiniMax-M2.5`
- `targetThinking = high`
- `targetContextTokens`

### Routing profiles currently stored in DB
- `deep_planning` → CEO / PM → 65536
- `research_synthesis` → Research / TrendStrategist → 65536
- `creative_artifacts` → CreativeDirector → 32768
- `builder` → FoundingEngineer / DevOps / Maintenance → 32768
- `execution_safe` → TikTokPublisher → 32768
- `qa_validation` → QA → 32768
- `fast_triage` / `fast_research` / `fast_ops` / `fast_validation` → fast variants → 24576

## Critical caveat
This routing metadata exists in DB, but **the current OpenClaw execution path does not yet fully enforce per-agent context budgets**.

That means the groundwork is there, but the next implementation step is to actually honor `runtime_config.routing.targetContextTokens` during execution.

## Current active repro / project state
TikTok project starter issues:
- `AKT-46` — in progress, 1 CEO comment
- `AKT-47` — in progress, 1 CEO comment
- `AKT-48` — in progress, 0 comments
- `AKT-49` — backlog
- `AKT-50` — backlog

Best current repro:
- `AKT-48`

## Remaining real blockers
1. Worker/runtime still not reliably honoring per-agent context routing
2. Issue mutation conflicts (`PATCH /issues/:id` and `POST /issues/:id/comments` can still hit 409)
3. Need to keep MiniMax policy while fixing autonomy issues

## OpenClaw worker findings
There are two config layers:
- Paperclip agent config in DB
- worker OpenClaw defaults in `/var/lib/openclaw-paperclip-worker/openclaw.json`

The worker default is currently back to:
- `minimax/MiniMax-M2.5`
- `thinkingDefault: high`
- `contextTokens: 16384`

This is probably too small for CEO/PM/research work, but Anton still wants MiniMax for testing. So the correct next move is **per-agent/per-run context enforcement while staying on MiniMax**, not a model swap.

## Suggested next steps
1. Wire `runtime_config.routing.targetContextTokens` into actual OpenClaw execution payload/runtime
2. Investigate and reduce issue ownership / checkout 409s during autonomous issue work
3. Re-run AKT-48 after runtime enforcement change
4. Then continue with AKT-49 and AKT-50
5. After stability improves, selectively adopt upstream infra fixes from `origin/master` without overwriting approval/artifact product behavior

## Reminder
If you feel tempted to do a broad upstream merge, don’t. Preserve the product layer first.

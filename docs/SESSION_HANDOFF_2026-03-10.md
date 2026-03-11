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

## Update — 2026-03-11

### Additional commits landed after the original handoff
- `0fcb2a5` — Cherry-pick safe upstream infra fixes
- `0abcc9e` — Cherry-pick backlog wake and agent dedupe fixes
- `0012273` — Reset stale and recovery task sessions before issue runs
- `5499265` — Allow assignee runs to adopt in-progress issue locks
- `2cb5f30` — Adopt stale execution locks for assignee issue runs
- `977f5c1` — Allow assignee comments despite stale checkout conflicts
- `edf10c6` — Log issue comment ownership conflict details
- `49ba6cf` — Allow assignee patch fallback on own in-progress issues
- `670bd95` — Skip checkout ownership for own issue comments and updates
- `ca040d0` — Log issue comment mutation conflicts
- `c5f293f` — Direct-post agent comments on own assigned issues
- `a6a6888` — Persist successful agent run replies back to issues
- `fe7d888` — Fix issue service import for run reply fallback

### What changed materially
- Route/ownership conflicts around same-assignee issue maintenance were significantly relaxed.
- Worker MiniMax context budget was raised to **65536** while keeping `MiniMax-M2.5` + high thinking.
- Safe upstream infrastructure fixes are now part of this branch.

### What is still not solved
The TikTok starter flow is **still blocked** at the runtime layer.

Current live issue state:
- `AKT-46` — in progress, 1 comment
- `AKT-47` — in progress, 1 comment
- `AKT-48` — in progress, 0 comments
- `AKT-49` — backlog
- `AKT-50` — backlog

Current dominant failures are:
- `openclaw_no_reply`
- `openclaw_request_failed` (`fetch failed`)

The old `ctx=16384` starvation problem was real and is now gone. However, the worker/gateway still often emits the synthetic terminal payload:
- `No response from OpenClaw.`

### Best current root-cause direction
The remaining blocker is no longer mainly Paperclip issue route logic.
It is now primarily the **OpenClaw worker / gateway result finalization path** for embedded agent runs.

The next session should continue there:
1. inspect the worker path that emits `No response from OpenClaw.`
2. inspect embedded run payload/result finalization
3. only after runtime fix, retry AKT-48 and then AKT-49/50

### Worker config reminder
Current worker config in `/var/lib/openclaw-paperclip-worker/openclaw.json` should remain:
- `MiniMax-M2.5`
- `thinkingDefault: high`
- `contextTokens: 65536`

Do not silently switch Paperclip agents to GPT-5.4.

### Repo note
There are untracked debug scripts right now:
- `server/scripts/debug-heartbeat.ts`
- `server/scripts/invoke-agent.ts`
- `server/scripts/repro-openclaw-exec.ts`

Decide deliberately next session whether to keep or delete them.

## Reminder
If you feel tempted to do a broad upstream merge, don’t. Preserve the product layer first.

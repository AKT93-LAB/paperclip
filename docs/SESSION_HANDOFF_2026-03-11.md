# Session Handoff — 2026-03-11

## Summary of Work Done

Fixed the dominant `openclaw_no_reply` failure mode that was causing CEO/PM runs to fail, then fixed the next-level autonomy bugs that were still stalling the TikTok Growth Engine project.

## Autonomy Standard (Important)

If Nova has to keep manually nudging issues, Paperclip is still broken.

The intended operating model is:
- agents create real approvals / comments / status transitions themselves
- PM detects structural blockers, not just status labels
- CEO mutates state when the issue requires it
- Anton is only pulled in for actual decisions/approvals

Do **not** mistake a successful manual rescue for a solved system. Manual rescues are diagnostics only.

## Root Causes Identified & Fixed

### 1. BOOTSTRAP.md in Worker Workspace (PRIMARY CAUSE)
**Problem:** `/home/node/.openclaw/workspace/BOOTSTRAP.md` existed in the `openclaw-paperclip-worker` container. OpenClaw's system prompt injection includes BOOTSTRAP.md in the agent context. Every CEO run got a "who are you?" bootstrap conversation injected into its context, causing the agent to be confused and return NO_REPLY instead of doing Paperclip work.

**Fix:**
- Deleted BOOTSTRAP.md from the worker container: `docker exec openclaw-paperclip-worker rm /home/node/.openclaw/workspace/BOOTSTRAP.md`
- Replaced IDENTITY.md, USER.md, SOUL.md with Paperclip-appropriate content
- Added MEMORY.md with key rules
- Committed the changes as a new image: `docker commit openclaw-paperclip-worker openclaw:paperclip-worker`

**Key rule added to SOUL.md:** "NEVER return NO_REPLY on Paperclip tasks. Always reply with a visible acknowledgment."

### 2. Corrupted Session History in OpenClaw
**Problem:** The 11 existing `paperclip:issue:*` sessions in the OpenClaw worker's session store all had BOOTSTRAP.md injected in their history. Even when Paperclip reset its own task session (for `issue_stale` wakes), OpenClaw still served the corrupted session from its internal store.

**Fix:** Deleted all 11 corrupted `paperclip:issue:*` sessions from:
- `/var/lib/openclaw-paperclip-worker/agents/main/sessions/sessions.json` (index)
- The corresponding JSONL files in the same directory

All future runs start with fresh, clean sessions.

### 3. MiniMax/OpenClaw Request Schema Mismatch (SECONDARY CAUSE)
**Problem:** Paperclip tuning attempted to send MiniMax `thinking` + `contextTokens` as top-level `/v1/responses` fields. The installed OpenClaw worker rejected them with `invalid_request_error: Unrecognized keys: "thinking", "contextTokens"`.

This created a new failure mode: Paperclip looked tuned for MiniMax high thinking, but actual wakes failed before doing any work.

**Fix:**
- Removed invalid top-level `thinking` / `contextTokens` keys from live Paperclip DB config so wakes stop crashing
- Patched `packages/adapters/openclaw/src/server/execute.ts` to strip unsupported top-level keys from the OpenResponses request body
- Preserved routing hints in metadata only:
  - `paperclip_routing_profile`
  - `paperclip_target_context_tokens`
  - `paperclip_target_thinking`
- Updated `server/src/__tests__/openclaw-adapter.test.ts` to assert the supported behavior

### 4. Fake Approval / Fake Blocker Narration
**Problem:** CEO was sometimes narrating state instead of mutating state. Example: it said AKT-46 was "awaiting approval" even though **no approval object existed in the DB**. It also hallucinated "run lock conflict" on AKT-48 while the issue had no live execution lock.

**Fix:**
- Updated CEO prompt in DB to require real Paperclip API mutations via `exec` + `curl`
- Added explicit truth rules:
  - never claim approval exists unless fetched/created
  - never claim lock conflict unless lock fields exist
  - stale wakes on owned incomplete issues must continue the work
- Updated PM prompt in DB to detect structural blockers (missing approvals, stale in-progress issues, false blockers) instead of status-only summaries

### 5. CEO "EXIT SILENTLY" Instructions
**Problem:** CEO instructions said "EXIT SILENTLY (no comment, no mentions)" for informational wake events. Combined with OpenClaw's NO_REPLY behavior, this caused the agent to literally return NO_REPLY.

**Fix:** Updated CEO `input` and `instructions` in DB to:
- Replace "EXIT SILENTLY" with "reply with one brief line explaining no action was taken"
- Add explicit rule: "You MUST always produce a visible text reply. Never return empty output."

## Verification

### Early verification
Runs at 2026-03-11 10:07 UTC succeeded for AKT-46 and AKT-47 after the BOOTSTRAP/session cleanup.

### Later verification (actual project movement)
- A real `human_decision` approval was created for **AKT-46**: `02a8571e-efa5-4031-b231-061876be7375`
- Approval status later became **approved**
- **AKT-46** advanced from `in_progress` → `in_review` → `done`
- Adapter regression test now passes after the OpenResponses payload fix:
  - `pnpm test:run server/src/__tests__/openclaw-adapter.test.ts`

This proves the system can again create real objects and move issue state, not just narrate progress.

### New long-term code guardrails added after that verification
- `server/src/routes/approvals.ts` now syncs linked issue lifecycle automatically when approvals are:
  - created
  - approved
  - rejected
  - revision_requested
  - resubmitted
- `server/src/services/approval-issue-lifecycle.ts` is now the shared server-side rule set for approval-driven issue progression:
  - human_decision created/resubmitted: `in_progress` → `in_review`
  - human_decision approved: `in_review`/`in_progress` → `done`
  - human_decision rejected/revision_requested: `in_review` → `in_progress`
  - action_execution approvals update linked issue state based on execution result (`done`/`blocked`)
- `server/src/services/agents.ts` now normalizes OpenClaw adapter config on create/update so unsupported payloadTemplate keys (`thinking`, `contextTokens`, `routingProfile`) are stripped before persistence
- Added regression tests:
  - `server/src/__tests__/approval-issue-lifecycle.test.ts`
  - `server/src/__tests__/agent-config-normalization.test.ts`

## Current Issue State

| Issue | Identifier | Status | Notes |
|-------|------------|--------|-------|
| AKT-46 | Define project objective, constraints, and success metrics | done | Real approval created and approved; issue completed properly |
| AKT-47 | Design approval map for this project | in_progress | Deliverable exists, but issue still needs proper autonomous close/advance logic |
| AKT-48 | Set up artifact package contract | in_progress | Still active blocker; previous fake “lock conflict” was hallucinated |
| AKT-49 | Create first reviewable work package | backlog | Waiting on AKT-47/48 to truly finish |
| AKT-50 | Create weekly learning loop | backlog | Downstream |
| AKT-51 | [INBOX] Human Decisions & Approvals | todo | Anton confirmed there were no pending human approvals when the system claimed otherwise |

## What Still Needs Attention

1. **AKT-47** — close or advance it autonomously based on the already-delivered approval map. Do not require Anton unless a real new approval is needed.
2. **AKT-48** — finish the artifact package contract issue; this is the main remaining blocker before AKT-49 can start.
3. **Systemic autonomy** — keep fixing Paperclip so PM/CEO do not require manual rescue runs from Nova. If a future step requires babysitting, treat that as a Paperclip bug, not success.
4. **Preventing regression** — keep the BOOTSTRAP/session cleanup lesson plus the OpenResponses payload lesson in mind. The worker image and adapter code must stay aligned.

## Architecture Notes

- Worker image: `openclaw:paperclip-worker` (committed 2026-03-11 10:12 UTC)
- Worker container: `openclaw-paperclip-worker` (restart policy: no)
- Sessions store: `/var/lib/openclaw-paperclip-worker/agents/main/sessions/`
- Workspace: `/home/node/.openclaw/workspace/` (inside container, NOT bind-mounted)
- DB agent configs: update via `docker exec -i paperclip-db-1 psql -U paperclip -d paperclip`
- Stuck detector cadence: fires every ~20 min for `in_progress` issues with no recent progress

## openclaw_request_failed (fetch failed)
Earlier `fetch failed` errors around 09:11 / 09:22 / 09:28 UTC looked transient.

A later class of failures turned out to be **request schema errors**, not infrastructure flakiness:
- MiniMax tuning inserted unsupported top-level OpenResponses keys (`thinking`, `contextTokens`)
- the worker rejected them before agent execution
- Paperclip then looked "stuck" even though the root cause was malformed adapter payloads

Lesson: when tuning Paperclip/OpenClaw, validate against the **installed worker's** accepted `/v1/responses` schema, not just assumptions from routing config.

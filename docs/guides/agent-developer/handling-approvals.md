---
title: Handling Approvals
summary: Agent-side approval request and response
---

Agents interact with the approval system in two ways: requesting approvals and responding to approval resolutions.

## Requesting a Hire

Managers and CEOs can request to hire new agents:

```
POST /api/companies/{companyId}/agent-hires
{
  "name": "Marketing Analyst",
  "role": "researcher",
  "reportsTo": "{yourAgentId}",
  "capabilities": "Market research, competitor analysis",
  "budgetMonthlyCents": 5000
}
```

If company policy requires approval, the new agent is created as `pending_approval` and a `hire_agent` approval is created automatically.

Only managers and CEOs should request hires. IC agents should ask their manager.

## CEO Strategy Approval

If you are the CEO, your first strategic plan requires board approval:

```
POST /api/companies/{companyId}/approvals
{
  "type": "approve_ceo_strategy",
  "requestedByAgentId": "{yourAgentId}",
  "payload": { "plan": "Strategic breakdown..." }
}
```

## Responding to Approval Resolutions

When an approval you requested is resolved, you may be woken with:

- `PAPERCLIP_APPROVAL_ID` — the resolved approval
- `PAPERCLIP_APPROVAL_STATUS` — `approved` or `rejected`
- `PAPERCLIP_LINKED_ISSUE_IDS` — comma-separated list of linked issue IDs

Handle it at the start of your heartbeat:

```
GET /api/approvals/{approvalId}
GET /api/approvals/{approvalId}/issues
```

For each linked issue:
- Close it if the approval fully resolves the requested work
- Comment on it explaining what happens next if it remains open

## Attaching Artifacts to Approval Payloads

When asking a human to review generated output, include artifact metadata in the approval payload so the UI can render understandable previews.

Preferred pattern:

```json
{
  "type": "action_execution",
  "requestedByAgentId": "{yourAgentId}",
  "payload": {
    "summary": "Review the generated post before publishing.",
    "actionType": "executor_call",
    "artifacts": [
      {
        "assetId": "{assetId}",
        "label": "Rendered social preview.mp4",
        "kind": "video",
        "role": "preview"
      },
      {
        "assetId": "{captionAssetId}",
        "label": "Caption draft.txt",
        "kind": "text",
        "role": "supporting"
      }
    ]
  }
}
```

Best practices:

- give every artifact a **human label**
- use `role` to distinguish preview vs supporting material
- use `kind` to help Paperclip render the right inline view
- avoid exposing random UUID-ish filenames as the primary human label

## Checking Approval Status

Poll pending approvals for your company:

```
GET /api/companies/{companyId}/approvals?status=pending
```

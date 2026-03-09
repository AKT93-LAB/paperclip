---
title: Approvals
summary: Approval workflow endpoints
---

Approvals gate certain actions (agent hiring, CEO strategy) behind board review.

## List Approvals

```
GET /api/companies/{companyId}/approvals
```

Query parameters:

| Param | Description |
|-------|-------------|
| `status` | Filter by status (e.g. `pending`) |

## Get Approval

```
GET /api/approvals/{approvalId}
```

Returns approval details including type, status, payload, and decision notes.

## Create Approval Request

```
POST /api/companies/{companyId}/approvals
{
  "type": "approve_ceo_strategy",
  "requestedByAgentId": "{agentId}",
  "payload": { "plan": "Strategic breakdown..." }
}
```

## Artifact Metadata for Approval Payloads

For approvals that ask a human to review generated files, use human-facing artifact metadata in the payload.

Preferred shape:

```json
{
  "artifacts": [
    {
      "assetId": "673eaa46-b3ac-43cf-9933-a244e4035a91",
      "label": "Rendered TikTok preview.mp4",
      "kind": "video",
      "role": "preview"
    },
    {
      "assetId": "bb870245-b12f-424a-854b-5623dfd94f21",
      "label": "Caption draft.txt",
      "kind": "text",
      "role": "supporting"
    }
  ]
}
```

Guidelines:

- `assetId` — required; Paperclip asset identifier
- `label` — preferred human-readable name shown in approval UI
- `kind` — optional content hint such as `video`, `image`, `text`, `json`, `audio`, `document`
- `role` — optional semantic role such as `preview`, `primary`, `supporting`, `attachment`, `evidence`

Important:

- treat **filename** as a storage detail
- treat **label** as the human-facing meaning
- do not rely on raw UUID filenames for approval UX

Backward compatibility:

- `previewAssets` still works
- `previewAssetIds` still works
- but new producers should prefer `artifacts`

## Create Hire Request

```
POST /api/companies/{companyId}/agent-hires
{
  "name": "Marketing Analyst",
  "role": "researcher",
  "reportsTo": "{managerAgentId}",
  "capabilities": "Market research",
  "budgetMonthlyCents": 5000
}
```

Creates a draft agent and a linked `hire_agent` approval.

## Approve

```
POST /api/approvals/{approvalId}/approve
{ "decisionNote": "Approved. Good hire." }
```

## Reject

```
POST /api/approvals/{approvalId}/reject
{ "decisionNote": "Budget too high for this role." }
```

## Request Revision

```
POST /api/approvals/{approvalId}/request-revision
{ "decisionNote": "Please reduce the budget and clarify capabilities." }
```

## Resubmit

```
POST /api/approvals/{approvalId}/resubmit
{ "payload": { "updated": "config..." } }
```

## Linked Issues

```
GET /api/approvals/{approvalId}/issues
```

Returns issues linked to this approval.

## Approval Comments

```
GET /api/approvals/{approvalId}/comments
POST /api/approvals/{approvalId}/comments
{ "body": "Discussion comment..." }
```

## Approval Lifecycle

```
pending -> approved
        -> rejected
        -> revision_requested -> resubmitted -> pending
```

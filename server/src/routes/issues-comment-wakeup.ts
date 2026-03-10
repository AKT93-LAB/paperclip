type CommentWakeInput = {
  actorType: "board" | "agent";
  actorAgentId: string | null;
  assigneeAgentId: string | null;
  reopened: boolean;
  interruptedRunId: string | null;
  commentBody: string;
};

export function shouldWakeAssigneeOnComment(input: CommentWakeInput): boolean {
  if (!input.assigneeAgentId) return false;
  if (input.reopened) return true;

  const trimmed = input.commentBody.trimStart();
  if (
    input.actorType === "agent" &&
    trimmed.toUpperCase().startsWith("INTERNAL:")
  ) {
    return false;
  }

  const isAgentSelfComment =
    input.actorType === "agent" &&
    Boolean(input.actorAgentId) &&
    input.actorAgentId === input.assigneeAgentId;

  if (!isAgentSelfComment) return true;

  // When an agent comments on its own assigned issue during an active execution,
  // waking it again creates redundant follow-up runs and comment/status loops.
  if (input.interruptedRunId) return false;

  return false;
}

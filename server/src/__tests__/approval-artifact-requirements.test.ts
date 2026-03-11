import { describe, expect, it } from "vitest";
import { issueRequiresArtifactBackedApproval } from "../services/approval-artifact-requirements.js";

describe("issueRequiresArtifactBackedApproval", () => {
  it("requires artifacts for reviewable work package issues", () => {
    expect(
      issueRequiresArtifactBackedApproval({
        title: "Create first reviewable work package",
        description: "Produce the first artifact package for this project and send it through the new approval flow.",
      }),
    ).toBe(true);
  });

  it("does not require artifacts for generic planning issues", () => {
    expect(
      issueRequiresArtifactBackedApproval({
        title: "Define project objective",
        description: "Document the objective and success metrics.",
      }),
    ).toBe(false);
  });
});

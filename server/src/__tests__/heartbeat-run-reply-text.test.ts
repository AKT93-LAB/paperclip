import { describe, expect, it } from "vitest";
import { extractRunReplyText } from "../services/heartbeat.js";

describe("extractRunReplyText", () => {
  it("reads top-level text from OpenClaw terminal payloads", () => {
    const text = extractRunReplyText({
      resultJson: {
        text: "Persist me to the issue thread.",
        type: "response.output_text.done",
      },
    } as any);

    expect(text).toBe("Persist me to the issue thread.");
  });

  it("ignores synthetic no-response terminal text", () => {
    const text = extractRunReplyText({
      resultJson: {
        text: "No response from OpenClaw.",
        type: "response.output_text.done",
      },
    } as any);

    expect(text).toBeNull();
  });
});

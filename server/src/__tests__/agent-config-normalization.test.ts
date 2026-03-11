import { describe, expect, it } from "vitest";
import { normalizeAdapterConfigForPersistence } from "../services/agents.js";

describe("normalizeAdapterConfigForPersistence", () => {
  it("strips unsupported OpenClaw payloadTemplate tuning keys while preserving top-level hints", () => {
    const normalized = normalizeAdapterConfigForPersistence("openclaw", {
      model: "minimax/MiniMax-M2.5",
      thinking: "high",
      contextTokens: 204800,
      payloadTemplate: {
        model: "minimax/MiniMax-M2.5",
        thinking: "high",
        contextTokens: 204800,
        routingProfile: "deep_planning",
        metadata: { keep: "yes" },
      },
    }) as Record<string, unknown>;

    expect(normalized.thinking).toBe("high");
    expect(normalized.contextTokens).toBe(204800);
    expect(normalized.payloadTemplate).toEqual({
      model: "minimax/MiniMax-M2.5",
      metadata: { keep: "yes" },
    });
  });

  it("leaves non-openclaw adapter configs alone", () => {
    const input = {
      command: "echo",
      payloadTemplate: { thinking: "high", contextTokens: 1234 },
    };
    expect(normalizeAdapterConfigForPersistence("process", input)).toEqual(input);
  });
});

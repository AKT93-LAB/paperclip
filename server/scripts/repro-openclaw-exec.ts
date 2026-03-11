import { execute } from "../../packages/adapters/openclaw/src/server/execute.ts";

const config = {
  url: "http://openclaw-paperclip-worker:18789/v1/responses",
  model: "openclaw:main",
  method: "POST",
  headers: {
    host: "localhost",
    "x-openclaw-auth": "Bearer b4f76f630c750bdc2ab05e5dbd2be4418f972f2915d986c67abaf26f5265ea0a",
  },
  timeoutSec: 240,
  paperclipApiUrl: "http://paperclip-paperclip-1:3100",
  payloadTemplate: {
    input: "\nYou are the CEO agent.\n\nNever create comment loops.\n",
    instructions:
      "You are a Paperclip company agent running via OpenClaw. Use the Paperclip API, post a single comment, and update issue status if appropriate.",
    max_output_tokens: 800,
  },
  sessionKeyStrategy: "issue",
};

const agent = {
  id: "263e0b18-ac62-4f92-a9b9-92ac772718ba",
  companyId: "38b7f052-f3cb-41e2-b950-06906a52f944",
  adapterType: "openclaw",
  name: "CEOpenclaw",
} as any;

const runtime = {
  taskId: "23a8ff36-0a6b-4a31-8563-6b7fb48d94e1",
  issueId: "23a8ff36-0a6b-4a31-8563-6b7fb48d94e1",
  wakeReason: "aut_tiktok_rescue",
  wakeSource: "on_demand",
  wakeTriggerDetail: "manual",
  context: {},
} as any;

const context = {
  taskId: "23a8ff36-0a6b-4a31-8563-6b7fb48d94e1",
  issueId: "23a8ff36-0a6b-4a31-8563-6b7fb48d94e1",
  wakeReason: "aut_tiktok_rescue",
  wakeSource: "on_demand",
  wakeTriggerDetail: "manual",
  projectId: "98903894-669a-4b08-8577-baa5a01b0da5",
} as any;

async function main() {
  const logs: Array<{ stream: string; text: string }> = [];
  const result = await execute({
    runId: "repro-run",
    agent,
    runtime,
    config,
    context,
    authToken: undefined,
    onLog: async (stream: string, text: string) => {
      logs.push({ stream, text });
      process.stdout.write(`[${stream}] ${text}`);
    },
    onMeta: async (meta: any) => {
      process.stdout.write(`[meta] ${JSON.stringify(meta)}\n`);
    },
  } as any);

  console.log("\nRESULT", JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

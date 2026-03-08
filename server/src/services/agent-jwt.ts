import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

export type AgentJwtClaims = {
  companyId: string;
  agentId: string;
  runId?: string | null;
  kind: "paperclip_agent";
};

function getSecret(): Uint8Array {
  const raw = process.env.PAPERCLIP_AGENT_JWT_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error("Missing PAPERCLIP_AGENT_JWT_SECRET (min 16 chars)");
  }
  return encoder.encode(raw);
}

export async function signAgentJwt(claims: AgentJwtClaims, ttlSec = 15 * 60): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const secret = getSecret();
  return await new SignJWT({
    companyId: claims.companyId,
    agentId: claims.agentId,
    runId: claims.runId ?? null,
    kind: "paperclip_agent",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSec)
    .sign(secret);
}

export async function verifyAgentJwt(token: string): Promise<AgentJwtClaims> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (payload.kind !== "paperclip_agent") {
    throw new Error("invalid agent jwt kind");
  }
  const companyId = String(payload.companyId || "");
  const agentId = String(payload.agentId || "");
  const runId = payload.runId ? String(payload.runId) : null;
  if (!companyId || !agentId) throw new Error("invalid agent jwt claims");
  return { companyId, agentId, runId, kind: "paperclip_agent" };
}

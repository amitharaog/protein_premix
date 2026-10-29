import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { isAgentWorkflowToken, OIDC_AUDIENCE, OIDC_ISSUER } from "./oidc";

let keys: ReturnType<typeof createLocalJWKSet>;
let sign: (claims: JWTPayload, opts?: { aud?: string; iss?: string; exp?: string }) => Promise<string>;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" }] });
  sign = (claims, o = {}) => new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(o.iss ?? OIDC_ISSUER).setAudience(o.aud ?? OIDC_AUDIENCE).setIssuedAt().setExpirationTime(o.exp ?? "5m").sign(privateKey);
});

const good = {
  repository: "amitharaog/protein_premix",
  event_name: "workflow_dispatch",
  workflow_ref: "amitharaog/protein_premix/.github/workflows/research-agents.yml@refs/heads/claude/hopeful-sagan-gd3awd",
};

describe("isAgentWorkflowToken", () => {
  it("accepts this repo's research-agents workflow started by hand or by the board", async () => {
    expect(await isAgentWorkflowToken(await sign(good), keys)).toBe(true);
  });

  it("refuses other repos, other workflows, other events, audiences and issuers", async () => {
    expect(await isAgentWorkflowToken(await sign({ ...good, repository: "someone/protein_premix" }), keys)).toBe(false);
    expect(await isAgentWorkflowToken(await sign({ ...good, workflow_ref: "amitharaog/protein_premix/.github/workflows/app-ci.yml@refs/heads/x" }), keys)).toBe(false);
    expect(await isAgentWorkflowToken(await sign({ ...good, event_name: "pull_request" }), keys)).toBe(false);
    expect(await isAgentWorkflowToken(await sign(good, { aud: "someone-else" }), keys)).toBe(false);
    expect(await isAgentWorkflowToken(await sign(good, { iss: "https://example.com" }), keys)).toBe(false);
  });

  it("refuses expired, unsigned and junk tokens", async () => {
    expect(await isAgentWorkflowToken(await sign(good, { exp: "-1m" }), keys)).toBe(false);
    const [h, p] = (await sign(good)).split(".");
    expect(await isAgentWorkflowToken(`${h}.${p}.`, keys)).toBe(false);
    expect(await isAgentWorkflowToken("not.a.token", keys)).toBe(false);
  });
});

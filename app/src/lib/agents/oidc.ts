import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { AGENTS_REPO, AGENTS_WORKFLOW } from "./github";

// The research-agents workflow proves who it is with a GitHub Actions OIDC token, so the repo needs no board secret.
// Only this repo's workflow file, started by workflow_dispatch (which needs write access to the repo), is accepted.

export const OIDC_ISSUER = "https://token.actions.githubusercontent.com";
export const OIDC_AUDIENCE = "muggoozz-agent-board";

let githubKeys: JWTVerifyGetKey | undefined;
const remoteKeys = () => (githubKeys ??= createRemoteJWKSet(new URL(`${OIDC_ISSUER}/.well-known/jwks`)));

export async function isAgentWorkflowToken(token: string, keys: JWTVerifyGetKey = remoteKeys()): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, keys, { issuer: OIDC_ISSUER, audience: OIDC_AUDIENCE, algorithms: ["RS256"] });
    return payload.repository === AGENTS_REPO
      && payload.event_name === "workflow_dispatch"
      && typeof payload.workflow_ref === "string"
      && payload.workflow_ref.startsWith(`${AGENTS_REPO}/.github/workflows/${AGENTS_WORKFLOW}@`);
  } catch {
    return false;
  }
}

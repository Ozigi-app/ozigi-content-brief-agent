import { writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createVertex } from "@ai-sdk/google-vertex";
import { CopilotRuntime, BuiltInAgent, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";

// Decode service account and write to a temp file — mirrors the main app's
// keyFilename pattern and lets google-auth-library handle JSON parsing.
const _creds = Buffer.from(process.env.GOOGLE_BASE64_CREDS!.trim(), "base64");
const CRED_PATH = join(tmpdir(), "ozigi-copilot-creds.json");
writeFileSync(CRED_PATH, _creds);
process.env.GOOGLE_APPLICATION_CREDENTIALS = CRED_PATH;

// Extract project_id without JSON.parse (avoids control-char issues in private_key).
const PROJECT_ID =
  _creds.toString("utf-8").match(/"project_id"\s*:\s*"([^"]+)"/)?.[1] ??
  "ozigi-489021";

console.log("[CopilotKit] Credentials ready. project:", PROJECT_ID);

const vertex = createVertex({ project: PROJECT_ID, location: "global" });

export function buildHandler() {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: new CopilotRuntime({
      agents: {
        default: new BuiltInAgent({
          model: vertex("gemini-3-flash-preview"),
        }),
      },
    }),
    endpoint: "/api/copilotkit",
  });

  return handleRequest;
}

const handler = buildHandler();
export const GET = handler;
export const POST = handler;

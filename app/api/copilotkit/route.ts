import { writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  CopilotRuntime,
  LangChainAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";

// Write the service account bytes to a temp file once at module load.
// This mirrors the main app's keyFilename approach and avoids JSON.parse
// issues with private keys that contain literal control characters.
const _creds = Buffer.from(process.env.GOOGLE_BASE64_CREDS!.trim(), "base64");
const CRED_PATH = join(tmpdir(), "ozigi-copilot-creds.json");
writeFileSync(CRED_PATH, _creds);

// Extract project_id with a simple regex — no JSON.parse needed.
const PROJECT_ID =
  _creds.toString("utf-8").match(/"project_id"\s*:\s*"([^"]+)"/)?.[1] ??
  "ozigi-489021";

console.log("[CopilotKit] Credentials written. project:", PROJECT_ID);

export function buildHandler() {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: new CopilotRuntime(),
    serviceAdapter: new LangChainAdapter({
      chainFn: async ({ messages, tools, threadId }) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { ChatGoogle } = require("@langchain/google-gauth");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { AIMessage } = require("@langchain/core/messages");

        // Gemini rejects AIMessages with empty content — filter them out
        const filteredMessages = messages.filter((message) => {
          if (!(message instanceof AIMessage)) return true;
          const aiMsg = message as any;
          return (
            (aiMsg.content && String(aiMsg.content).trim().length > 0) ||
            (aiMsg.tool_calls && aiMsg.tool_calls.length > 0)
          );
        });

        const model = new ChatGoogle({
          model: "gemini-3-flash-preview",
          platformType: "gcp",
          location: "global",
          authOptions: {
            keyFilename: CRED_PATH,
            projectId: PROJECT_ID,
          },
        }).bindTools(tools);

        return model.stream(filteredMessages, {
          metadata: { conversation_id: threadId },
        });
      },
    }),
    endpoint: "/api/copilotkit",
  });

  return handleRequest;
}

const handler = buildHandler();
export const GET = handler;
export const POST = handler;

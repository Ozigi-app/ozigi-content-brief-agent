import {
  CopilotRuntime,
  LangChainAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";

function decodeServiceAccount(b64: string) {
  const raw = Buffer.from(b64.trim(), "base64").toString("utf-8");
  // Service account JSONs sometimes have literal control chars (e.g. newlines)
  // inside string values, making them invalid JSON. Walk char-by-char and escape them.
  let result = "";
  let inString = false;
  let escaped = false;
  for (const ch of raw) {
    if (escaped) {
      result += ch;
      escaped = false;
    } else if (ch === "\\") {
      result += ch;
      escaped = true;
    } else if (ch === '"') {
      result += ch;
      inString = !inString;
    } else if (inString && (ch === "\n" || ch === "\r" || ch === "\t")) {
      if (ch === "\n") result += "\\n";
      else if (ch === "\r") result += "\\r";
      else result += "\\t";
    } else {
      result += ch;
    }
  }
  return JSON.parse(result);
}

export const POST = async (req: Request) => {
  let credentials: any;
  try {
    credentials = decodeServiceAccount(process.env.GOOGLE_BASE64_CREDS!);
  } catch (e) {
    console.error("[CopilotKit] Failed to decode GOOGLE_BASE64_CREDS:", e);
    return new Response("Credential decode error: " + String(e), { status: 500 });
  }

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

        console.log("[CopilotKit] Using project:", credentials.project_id, "client_email:", credentials.client_email);

        const model = new ChatGoogle({
          model: "gemini-3-flash-preview",
          platformType: "gcp",
          location: "global",
          authOptions: {
            credentials,
            projectId: credentials.project_id,
          },
        }).bindTools(tools);

        console.log("[CopilotKit] ChatGoogle model created, streaming...");
        return model.stream(filteredMessages, {
          metadata: { conversation_id: threadId },
        });
      },
    }),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};

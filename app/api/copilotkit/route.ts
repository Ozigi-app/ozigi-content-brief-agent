import {
  CopilotRuntime,
  LangChainAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";

export const POST = async (req: Request) => {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_BASE64_CREDS!, "base64").toString("utf-8")
  );

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
          model: "gemini-2.0-flash-001",
          platformType: "gcp",   // Vertex AI — matches service account auth
          location: "us-central1",
          authOptions: {
            credentials,
            projectId: credentials.project_id,
          },
        }).bindTools(tools);

        return model.stream(filteredMessages, {
          metadata: { conversation_id: threadId },
        });
      },
    }),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};

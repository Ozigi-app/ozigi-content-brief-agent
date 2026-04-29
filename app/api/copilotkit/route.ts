import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";

export const POST = async (req: Request) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: new CopilotRuntime(),
    serviceAdapter: new GoogleGenerativeAIAdapter({
      model: "gemini-2.5-flash",
      apiVersion: "v1",
      apiKey: process.env.GOOGLE_API_KEY,
    }),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};

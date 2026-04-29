// Catch-all for CopilotKit sub-paths (e.g. /api/copilotkit/info).
// Next.js App Router routes are file-based, so sub-paths like /info need
// their own handler — this forwards them all to the same Hono runtime.
import { buildHandler } from "../route";

const handler = buildHandler();
export const GET = handler;
export const POST = handler;

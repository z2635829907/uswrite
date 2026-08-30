import { NextRequest } from "next/server";
import { getSpringToken } from "@/lib/auth";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// Spring Boot 后端地址,可通过环境变量覆盖
const BASE_URL = process.env.SPRING_API_URL || "http://localhost:8080";

/** 透传后端的 SSE 流式回答给前端。 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = await getSpringToken();
    const up = await fetch(`${BASE_URL}/api/assistant/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return new Response(up.body, {
      status: up.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return fail(e);
  }
}

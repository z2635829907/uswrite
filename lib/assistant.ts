import { ResponseError } from "./errors";

// AI 助手服务(FastAPI + LangChain)地址,可通过环境变量覆盖
const BASE_URL = process.env.ASSISTANT_API_URL || "http://localhost:8000";

export interface AssistantOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

/** 调用 AI 助手服务,成功返回响应数据,失败抛出 ResponseError。 */
export async function assistantFetch<T = Record<string, unknown>>(
  path: string,
  opts: AssistantOptions = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  let data: Record<string, unknown> | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.ok) {
    throw new ResponseError(
      res.status,
      (data?.error as string) || "服务器开小差了，请稍后再试"
    );
  }
  return data as T;
}

export { BASE_URL as ASSISTANT_API_URL };

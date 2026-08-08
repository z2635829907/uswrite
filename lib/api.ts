import { NextResponse } from "next/server";
import { ResponseError } from "./auth";

export function ok(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data });
}

export function fail(error: unknown) {
  const status =
    error instanceof ResponseError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "服务器开小差了，请稍后再试";
  if (status === 500) console.error(error);
  return NextResponse.json({ ok: false, error: message }, { status });
}

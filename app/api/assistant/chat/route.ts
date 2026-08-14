import { NextRequest, NextResponse } from "next/server";
import { springFetch } from "@/lib/spring";
import { getSpringToken } from "@/lib/auth";
import { fail } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = await getSpringToken();
    const data = await springFetch("/api/assistant/chat", {
      method: "POST",
      body,
      token,
    });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

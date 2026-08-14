import { NextRequest, NextResponse } from "next/server";
import { springFetch } from "@/lib/spring";
import { getSpringToken, requireUser } from "@/lib/auth";
import { fail } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const token = await getSpringToken();
    const body = await req.json();
    const data = await springFetch("/api/posts", { method: "POST", body, token });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

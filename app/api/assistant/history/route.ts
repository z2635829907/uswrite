import { NextRequest, NextResponse } from "next/server";
import { springFetch } from "@/lib/spring";
import { getSpringToken, requireUser } from "@/lib/auth";
import { fail } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    const token = await getSpringToken();
    const data = await springFetch("/api/assistant/history", { token });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    await requireUser();
    const token = await getSpringToken();
    const data = await springFetch("/api/assistant/history", { method: "DELETE", token });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

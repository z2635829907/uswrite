import { NextRequest, NextResponse } from "next/server";
import { springFetch } from "@/lib/spring";
import { getSpringToken, requireUser } from "@/lib/auth";
import { fail } from "@/lib/api";

export async function POST(_req: NextRequest) {
  try {
    await requireUser();
    const token = await getSpringToken();
    const data = await springFetch("/api/notifications/read-all", {
      method: "POST",
      token,
    });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

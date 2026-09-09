import { NextRequest, NextResponse } from "next/server";
import { assistantFetch } from "@/lib/assistant";
import { getSpringToken, requireAdmin } from "@/lib/auth";
import { fail } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const token = await getSpringToken();
    const data = await assistantFetch("/api/admin/rag", { token });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const token = await getSpringToken();
    const body = await req.json();
    const data = await assistantFetch("/api/admin/rag", { method: "POST", body, token });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

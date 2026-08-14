import { NextRequest, NextResponse } from "next/server";
import { springFetch } from "@/lib/spring";
import { getSpringToken, requireUser } from "@/lib/auth";
import { fail } from "@/lib/api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const token = await getSpringToken();
    const { id } = await params;
    const data = await springFetch(`/api/posts/${id}/like`, { method: "POST", token });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

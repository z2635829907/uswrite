import { NextRequest, NextResponse } from "next/server";
import { springFetch } from "@/lib/spring";
import { getSpringToken, requireAdmin } from "@/lib/auth";
import { fail } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const token = await getSpringToken();
    const { id } = await params;
    const body = await req.json();
    const data = await springFetch(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      body,
      token,
    });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

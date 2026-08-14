import { NextRequest, NextResponse } from "next/server";
import { springFetch } from "@/lib/spring";
import { getSpringToken, requireAdmin } from "@/lib/auth";
import { fail } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const token = await getSpringToken();
    const { id } = await params;
    const body = await req.json();
    const data = await springFetch(`/api/admin/rag/${id}`, {
      method: "PATCH",
      body,
      token,
    });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const token = await getSpringToken();
    const { id } = await params;
    const data = await springFetch(`/api/admin/rag/${id}`, { method: "DELETE", token });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

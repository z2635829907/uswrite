import { NextRequest, NextResponse } from "next/server";
import { springFetch } from "@/lib/spring";
import { getSpringToken } from "@/lib/auth";
import { fail } from "@/lib/api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getSpringToken();
    const data = await springFetch(`/api/posts/${id}/view`, { method: "POST", token });
    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

import { getSessionUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return ok({ user: null });
    return ok({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (e) {
    return fail(e);
  }
}

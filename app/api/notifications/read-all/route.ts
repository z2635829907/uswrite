import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";

export async function POST() {
  try {
    const user = await requireUser();
    db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(
      user.id
    );
    return ok();
  } catch (e) {
    return fail(e);
  }
}

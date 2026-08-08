import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = profileSchema.parse(await req.json());
    db.prepare(
      `UPDATE users SET display_name = ?, bio = ?, website = ?, avatar_seed = ?, updated_at = ? WHERE id = ?`
    ).run(
      body.displayName.trim(),
      body.bio.trim(),
      body.website.trim(),
      body.avatarSeed.trim(),
      Date.now(),
      user.id
    );
    return ok();
  } catch (e) {
    return fail(e);
  }
}

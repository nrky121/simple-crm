/**
 * POST /api/auth/profile
 * Called after sign-up to ensure a profile row exists for the new user.
 * Safe to call multiple times — uses upsert.
 */
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";
import { UnauthorizedError } from "@/lib/api/errors";

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new UnauthorizedError("Not authenticated");

    const profile = await prisma.profile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email!,
        fullName: user.user_metadata?.full_name ?? null,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      },
      update: {},
    });

    return successResponse(profile);
  } catch (e) {
    return errorResponse(e);
  }
}

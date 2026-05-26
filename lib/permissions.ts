import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/api/errors";

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError("Not authenticated");
  }

  // Upsert: create the profile row on first API call if it doesn't exist yet.
  // This handles users who registered before the profile-creation flow was added.
  const profile = await prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email!,
      fullName: user.user_metadata?.full_name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    },
    update: {},   // never overwrite existing data on login
  });

  if (!profile.isActive) {
    throw new UnauthorizedError("Account is inactive");
  }

  return profile;
}

export async function assertIsAdmin() {
  const profile = await getCurrentUser();
  if (profile.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
  return profile;
}

export async function assertCanEdit(ownerId: string) {
  const profile = await getCurrentUser();
  if (profile.role !== "ADMIN" && profile.id !== ownerId) {
    throw new ForbiddenError("You do not have permission to edit this record");
  }
  return profile;
}

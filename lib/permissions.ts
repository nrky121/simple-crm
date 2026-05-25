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

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile || !profile.isActive) {
    throw new UnauthorizedError("Profile not found or inactive");
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

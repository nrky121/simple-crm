import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { updateProfileSchema } from "@/lib/validations/profile";
import { ValidationError } from "@/lib/api/errors";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return successResponse(user);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid input", parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const updated = await prisma.profile.update({
      where: { id: user.id },
      data: parsed.data,
    });
    return successResponse(updated);
  } catch (e) {
    return errorResponse(e);
  }
}

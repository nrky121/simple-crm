import { NextRequest } from "next/server";
import { prisma, auditUserStorage } from "@/lib/prisma";
import { getCurrentUser, assertIsAdmin } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createTagSchema } from "@/lib/validations/tag";
import { ValidationError } from "@/lib/api/errors";

export async function GET() {
  try {
    await getCurrentUser();
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    return successResponse(tags);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await assertIsAdmin();
    const body = await request.json();
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }
    const tag = await auditUserStorage.run({ userId: user.id }, async () =>
      prisma.tag.create({ data: parsed.data })
    );
    return successResponse(tag, 201);
  } catch (e) {
    return errorResponse(e);
  }
}

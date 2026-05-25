import { NextRequest } from "next/server";
import { prisma, auditUserStorage } from "@/lib/prisma";
import { assertIsAdmin } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { updateTagSchema } from "@/lib/validations/tag";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await assertIsAdmin();
    const tag = await prisma.tag.findUnique({ where: { id: params.id } });
    if (!tag) throw new NotFoundError("Tag not found");

    const body = await request.json();
    const parsed = updateTagSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }
    const updated = await auditUserStorage.run({ userId: user.id }, async () =>
      prisma.tag.update({ where: { id: params.id }, data: parsed.data })
    );
    return successResponse(updated);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await assertIsAdmin();
    const tag = await prisma.tag.findUnique({ where: { id: params.id } });
    if (!tag) throw new NotFoundError("Tag not found");

    await auditUserStorage.run({ userId: user.id }, async () =>
      prisma.tag.delete({ where: { id: params.id } })
    );
    return successResponse({ deleted: true });
  } catch (e) {
    return errorResponse(e);
  }
}

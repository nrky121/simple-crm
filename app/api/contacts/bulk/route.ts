import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { bulkContactSchema } from "@/lib/validations/contact";
import { ValidationError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser();
    const body = await request.json();
    const parsed = bulkContactSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { ids, action, ownerId, tagId } = parsed.data;
    let result: { count: number } | undefined;

    switch (action) {
      case "archive":
        result = await prisma.contact.updateMany({
          where: { id: { in: ids } },
          data: { isArchived: true },
        });
        break;
      case "unarchive":
        result = await prisma.contact.updateMany({
          where: { id: { in: ids } },
          data: { isArchived: false },
        });
        break;
      case "assign": {
        if (!ownerId) throw new ValidationError("Invalid input", { ownerId: ["Required"] });
        result = await prisma.contact.updateMany({
          where: { id: { in: ids } },
          data: { ownerId },
        });
        break;
      }
      case "tag": {
        if (!tagId) throw new ValidationError("Invalid input", { tagId: ["Required"] });
        await Promise.all(
          ids.map((contactId) =>
            prisma.contactTag.upsert({
              where: { contactId_tagId: { contactId, tagId } },
              create: { contactId, tagId },
              update: {},
            })
          )
        );
        result = { count: ids.length };
        break;
      }
      case "untag": {
        if (!tagId) throw new ValidationError("Invalid input", { tagId: ["Required"] });
        result = await prisma.contactTag.deleteMany({
          where: { contactId: { in: ids }, tagId },
        });
        break;
      }
    }

    return successResponse({ action, affected: result?.count ?? ids.length });
  } catch (e) {
    return errorResponse(e);
  }
}

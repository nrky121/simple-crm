import { NextRequest } from "next/server";
import { prisma, auditUserStorage } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { bulkContactSchema } from "@/lib/validations/contact";
import { ValidationError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const parsed = bulkContactSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { ids, action, ownerId, tagId } = parsed.data;

    const result = await auditUserStorage.run({ userId: user.id }, async () => {
      switch (action) {
        case "archive":
          return prisma.contact.updateMany({
            where: { id: { in: ids } },
            data: { isArchived: true },
          });

        case "unarchive":
          return prisma.contact.updateMany({
            where: { id: { in: ids } },
            data: { isArchived: false },
          });

        case "assign": {
          if (!ownerId) {
            throw new ValidationError("Invalid input", {
              ownerId: ["ownerId is required for assign action"],
            });
          }
          return prisma.contact.updateMany({
            where: { id: { in: ids } },
            data: { ownerId },
          });
        }

        case "tag": {
          if (!tagId) {
            throw new ValidationError("Invalid input", {
              tagId: ["tagId is required for tag action"],
            });
          }
          // upsert each tag association
          await Promise.all(
            ids.map((contactId) =>
              prisma.contactTag.upsert({
                where: { contactId_tagId: { contactId, tagId } },
                create: { contactId, tagId },
                update: {},
              })
            )
          );
          return { count: ids.length };
        }

        case "untag": {
          if (!tagId) {
            throw new ValidationError("Invalid input", {
              tagId: ["tagId is required for untag action"],
            });
          }
          return prisma.contactTag.deleteMany({
            where: { contactId: { in: ids }, tagId },
          });
        }
      }
    });

    return successResponse({ action, affected: result?.count ?? ids.length });
  } catch (e) {
    return errorResponse(e);
  }
}

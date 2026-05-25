import { NextRequest } from "next/server";
import { prisma, auditUserStorage } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { z } from "zod";

const addTagSchema = z.object({
  tagId: z.string().uuid("Invalid tag ID"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
    });
    if (!contact) throw new NotFoundError("Contact not found");

    const body = await request.json();
    const parsed = addTagSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const tag = await prisma.tag.findUnique({ where: { id: parsed.data.tagId } });
    if (!tag) throw new NotFoundError("Tag not found");

    const contactTag = await auditUserStorage.run(
      { userId: user.id },
      async () =>
        prisma.contactTag.upsert({
          where: {
            contactId_tagId: {
              contactId: params.id,
              tagId: parsed.data.tagId,
            },
          },
          create: { contactId: params.id, tagId: parsed.data.tagId },
          update: {},
          include: { tag: true },
        })
    );
    return successResponse(contactTag, 201);
  } catch (e) {
    return errorResponse(e);
  }
}

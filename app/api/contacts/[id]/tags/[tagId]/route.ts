import { NextRequest } from "next/server";
import { prisma, auditUserStorage } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; tagId: string } }
) {
  try {
    const user = await getCurrentUser();

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
    });
    if (!contact) throw new NotFoundError("Contact not found");

    const contactTag = await prisma.contactTag.findUnique({
      where: {
        contactId_tagId: { contactId: params.id, tagId: params.tagId },
      },
    });
    if (!contactTag) throw new NotFoundError("Tag not attached to contact");

    await auditUserStorage.run({ userId: user.id }, async () =>
      prisma.contactTag.delete({
        where: {
          contactId_tagId: { contactId: params.id, tagId: params.tagId },
        },
      })
    );
    return successResponse({ removed: true });
  } catch (e) {
    return errorResponse(e);
  }
}

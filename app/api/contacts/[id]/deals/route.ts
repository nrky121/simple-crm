import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getCurrentUser();

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
    });
    if (!contact) throw new NotFoundError("Contact not found");

    const dealContacts = await prisma.dealContact.findMany({
      where: { contactId: params.id },
      include: {
        deal: {
          include: {
            company: { select: { id: true, name: true } },
            owner: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const deals = dealContacts.map((dc: typeof dealContacts[number]) => ({
      ...dc.deal,
      isPrimary: dc.isPrimary,
    }));

    return successResponse(deals);
  } catch (e) {
    return errorResponse(e);
  }
}

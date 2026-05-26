import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { updateContactSchema } from "@/lib/validations/contact";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

async function getContact(id: string) {
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { id: true, fullName: true } },
      tags: { include: { tag: true } },
      activities: {
        take: 10,
        orderBy: { occurredAt: "desc" },
        include: {
          createdBy: { select: { id: true, fullName: true } },
        },
      },
      tasks: {
        orderBy: { dueDate: "asc" },
        include: {
          assignee: { select: { id: true, fullName: true } },
        },
      },
    },
  });
  if (!contact) throw new NotFoundError("Contact not found");
  return contact;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getCurrentUser();
    const contact = await getContact(params.id);
    return successResponse(contact);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getCurrentUser();

    const body = await request.json();
    const parsed = updateContactSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const updated = await prisma.contact.update({
      where: { id: params.id },
      data: parsed.data,
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, fullName: true } },
        tags: { include: { tag: true } },
      },
    });
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
    await getCurrentUser();

    const archived = await prisma.contact.update({
      where: { id: params.id },
      data: { isArchived: true },
    });
    return successResponse({ archived: true, id: archived.id });
  } catch (e) {
    return errorResponse(e);
  }
}

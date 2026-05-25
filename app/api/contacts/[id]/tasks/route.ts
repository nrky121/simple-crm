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

    const tasks = await prisma.task.findMany({
      where: { contactId: params.id },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      include: {
        assignee: { select: { id: true, fullName: true } },
      },
    });

    return successResponse(tasks);
  } catch (e) {
    return errorResponse(e);
  }
}

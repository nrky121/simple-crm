import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { createTaskSchema } from "@/lib/validations/task";

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
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid input", parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { dueDate, ...rest } = parsed.data;
    const task = await prisma.task.create({
      data: {
        ...rest,
        contactId: params.id,
        assigneeId: user.id,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      include: {
        assignee: { select: { id: true, fullName: true } },
      },
    });

    return successResponse(task, 201);
  } catch (e) {
    return errorResponse(e);
  }
}

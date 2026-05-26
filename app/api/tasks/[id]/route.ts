import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { updateTaskSchema } from "@/lib/validations/task";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getCurrentUser();

    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) throw new NotFoundError("Task not found");

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid input", parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { dueDate, ...rest } = parsed.data;
    const updated = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(dueDate !== undefined
          ? { dueDate: dueDate ? new Date(dueDate) : null }
          : {}),
        ...(rest.status === "DONE" ? { completedAt: new Date() } : {}),
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, fullName: true } },
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

    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) throw new NotFoundError("Task not found");

    await prisma.task.delete({ where: { id: params.id } });
    return successResponse({ deleted: true });
  } catch (e) {
    return errorResponse(e);
  }
}

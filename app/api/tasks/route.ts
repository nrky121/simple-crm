import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/api/errors";
import { taskFiltersSchema, createTaskSchema } from "@/lib/validations/task";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const url = new URL(request.url);
    const parsed = taskFiltersSchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new ValidationError("Invalid filters", parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { status, priority, contactId } = parsed.data;

    const where = {
      assigneeId: user.id, // show tasks assigned to current user
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(contactId ? { contactId } : {}),
    };

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { status: "asc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
      take: 100,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, fullName: true } },
      },
    });

    return successResponse({ items: tasks, meta: { total: tasks.length } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid input", parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { dueDate, ...rest } = parsed.data;
    const task = await prisma.task.create({
      data: {
        ...rest,
        assigneeId: user.id,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, fullName: true } },
      },
    });

    return successResponse(task, 201);
  } catch (e) {
    return errorResponse(e);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { buildCursorWhere, parsePageSize, encodeCursor } from "@/lib/api/pagination";
import { createActivitySchema } from "@/lib/validations/activity";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getCurrentUser();

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
    });
    if (!contact) throw new NotFoundError("Contact not found");

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const pageSize = parsePageSize(url.searchParams.get("limit"));
    const limit = pageSize + 1;
    const cursorWhere = buildCursorWhere(cursor);

    const where = {
      contactId: params.id,
      ...(cursorWhere && cursorWhere),
    };

    const activities = await prisma.activity.findMany({
      where,
      take: limit,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    const hasMore = activities.length > pageSize;
    const items = hasMore ? activities.slice(0, -1) : activities;
    const nextCursor = hasMore
      ? encodeCursor({
          id: items[items.length - 1].id,
          createdAt: items[items.length - 1].createdAt.toISOString(),
        })
      : null;

    const total = await prisma.activity.count({ where: { contactId: params.id } });

    return successResponse({ items, meta: { nextCursor, total } });
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
    const parsed = createActivitySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid input", parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { occurredAt, ...rest } = parsed.data;
    const activity = await prisma.activity.create({
      data: {
        ...rest,
        contactId: params.id,
        createdById: user.id,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    return successResponse(activity, 201);
  } catch (e) {
    return errorResponse(e);
  }
}

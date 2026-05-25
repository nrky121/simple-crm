import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma, auditUserStorage } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createContactSchema, contactFiltersSchema } from "@/lib/validations/contact";
import { ValidationError } from "@/lib/api/errors";
import {
  buildCursorWhere,
  parsePageSize,
  encodeCursor,
} from "@/lib/api/pagination";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const url = new URL(request.url);
    const params = contactFiltersSchema.parse(
      Object.fromEntries(url.searchParams)
    );

    const pageSize = parsePageSize(params.limit);
    const limit = pageSize + 1;
    const cursorWhere = buildCursorWhere(params.cursor);

    const where: Prisma.ContactWhereInput = {
      isArchived: params.isArchived ?? false,
      ...(params.search && {
        OR: [
          { firstName: { contains: params.search, mode: "insensitive" } },
          { lastName: { contains: params.search, mode: "insensitive" } },
          { email: { contains: params.search, mode: "insensitive" } },
        ],
      }),
      ...(params.companyId && { companyId: params.companyId }),
      ...(params.ownerId && { ownerId: params.ownerId }),
      ...(params.tagId && { tags: { some: { tagId: params.tagId } } }),
      ...(cursorWhere && cursorWhere),
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        take: limit,
        orderBy: [
          { [params.sortBy ?? "createdAt"]: params.sortDir ?? "desc" },
          { id: "desc" },
        ],
        include: {
          company: { select: { id: true, name: true } },
          owner: { select: { id: true, fullName: true } },
          tags: { include: { tag: true } },
        },
      }),
      prisma.contact.count({ where: { isArchived: params.isArchived ?? false } }),
    ]);

    const hasMore = contacts.length > pageSize;
    const items = hasMore ? contacts.slice(0, -1) : contacts;
    const nextCursor = hasMore
      ? encodeCursor({
          id: items[items.length - 1].id,
          createdAt: items[items.length - 1].createdAt.toISOString(),
        })
      : null;

    void user; // user fetched for auth check
    return successResponse({ items, meta: { nextCursor, total } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const data = {
      ...parsed.data,
      ownerId: parsed.data.ownerId ?? user.id,
    };

    const contact = await auditUserStorage.run({ userId: user.id }, async () =>
      prisma.contact.create({
        data,
        include: {
          company: { select: { id: true, name: true } },
          owner: { select: { id: true, fullName: true } },
          tags: { include: { tag: true } },
        },
      })
    );
    return successResponse(contact, 201);
  } catch (e) {
    return errorResponse(e);
  }
}

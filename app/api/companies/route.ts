import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma, auditUserStorage } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createCompanySchema, companyFiltersSchema } from "@/lib/validations/company";
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
    const params = companyFiltersSchema.parse(
      Object.fromEntries(url.searchParams)
    );

    const pageSize = parsePageSize(params.limit);
    const limit = pageSize + 1;
    const cursorWhere = buildCursorWhere(params.cursor);

    const where: Prisma.CompanyWhereInput = {
      isArchived: params.isArchived ?? false,
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: "insensitive" } },
          { domain: { contains: params.search, mode: "insensitive" } },
          { industry: { contains: params.search, mode: "insensitive" } },
        ],
      }),
      ...(params.industry && {
        industry: { contains: params.industry, mode: "insensitive" },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(params.size && { size: params.size as any }),
      ...(params.ownerId && { ownerId: params.ownerId }),
      ...(params.tagId && { tags: { some: { tagId: params.tagId } } }),
      ...(cursorWhere && cursorWhere),
    };

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        take: limit,
        orderBy: [
          { [params.sortBy ?? "createdAt"]: params.sortDir ?? "desc" },
          { id: "desc" },
        ],
        include: {
          tags: { include: { tag: true } },
          _count: { select: { contacts: true, deals: true } },
        },
      }),
      prisma.company.count({ where: { isArchived: params.isArchived ?? false } }),
    ]);

    const hasMore = companies.length > pageSize;
    const items = hasMore ? companies.slice(0, -1) : companies;
    const nextCursor = hasMore
      ? encodeCursor({
          id: items[items.length - 1].id,
          createdAt: items[items.length - 1].createdAt.toISOString(),
        })
      : null;

    void user;
    return successResponse({ items, meta: { nextCursor, total } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const parsed = createCompanySchema.safeParse(body);
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

    const company = await auditUserStorage.run({ userId: user.id }, async () =>
      prisma.company.create({
        data,
        include: {
          tags: { include: { tag: true } },
          _count: { select: { contacts: true, deals: true } },
        },
      })
    );
    return successResponse(company, 201);
  } catch (e) {
    return errorResponse(e);
  }
}

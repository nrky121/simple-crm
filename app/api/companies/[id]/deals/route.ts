import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";
import { buildCursorWhere, parsePageSize, encodeCursor } from "@/lib/api/pagination";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getCurrentUser();

    const company = await prisma.company.findUnique({
      where: { id: params.id },
    });
    if (!company) throw new NotFoundError("Company not found");

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const pageSize = parsePageSize(url.searchParams.get("limit"));
    const limit = pageSize + 1;
    const cursorWhere = buildCursorWhere(cursor);

    const where = {
      companyId: params.id,
      isArchived: false,
      ...(cursorWhere && cursorWhere),
    };

    const deals = await prisma.deal.findMany({
      where,
      take: limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        owner: { select: { id: true, fullName: true } },
        contacts: {
          include: {
            contact: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const hasMore = deals.length > pageSize;
    const items = hasMore ? deals.slice(0, -1) : deals;
    const nextCursor = hasMore
      ? encodeCursor({
          id: items[items.length - 1].id,
          createdAt: items[items.length - 1].createdAt.toISOString(),
        })
      : null;

    const total = await prisma.deal.count({
      where: { companyId: params.id, isArchived: false },
    });

    return successResponse({ items, meta: { nextCursor, total } });
  } catch (e) {
    return errorResponse(e);
  }
}

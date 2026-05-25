import { NextRequest } from "next/server";
import { prisma, auditUserStorage } from "@/lib/prisma";
import { getCurrentUser, assertCanEdit } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";
import { updateCompanySchema } from "@/lib/validations/company";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

async function getCompany(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      _count: { select: { contacts: true, deals: true } },
    },
  });
  if (!company) throw new NotFoundError("Company not found");
  return company;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getCurrentUser();
    const company = await getCompany(params.id);
    return successResponse(company);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const company = await getCompany(params.id);
    await assertCanEdit(company.ownerId ?? user.id);

    const body = await request.json();
    const parsed = updateCompanySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const updated = await auditUserStorage.run({ userId: user.id }, async () =>
      prisma.company.update({
        where: { id: params.id },
        data: parsed.data,
        include: {
          tags: { include: { tag: true } },
          _count: { select: { contacts: true, deals: true } },
        },
      })
    );
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
    const user = await getCurrentUser();
    const company = await getCompany(params.id);
    await assertCanEdit(company.ownerId ?? user.id);

    const archived = await auditUserStorage.run({ userId: user.id }, async () =>
      prisma.company.update({
        where: { id: params.id },
        data: { isArchived: true },
      })
    );
    return successResponse({ archived: true, id: archived.id });
  } catch (e) {
    return errorResponse(e);
  }
}

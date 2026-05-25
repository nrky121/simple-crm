import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { errorResponse } from "@/lib/api/response";
import { contactFiltersSchema } from "@/lib/validations/contact";

function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(fields: (string | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(",");
}

export async function GET(request: NextRequest) {
  try {
    await getCurrentUser();

    const url = new URL(request.url);
    const params = contactFiltersSchema.parse(
      Object.fromEntries(url.searchParams)
    );

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
    };

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: [
        { [params.sortBy ?? "createdAt"]: params.sortDir ?? "desc" },
        { id: "desc" },
      ],
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, fullName: true } },
        tags: { include: { tag: true } },
      },
    });

    const header = toCsvRow([
      "ID",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Title",
      "Company",
      "Owner",
      "Tags",
      "Source",
      "LinkedIn URL",
      "Twitter Handle",
      "Notes",
      "Is Archived",
      "Created At",
      "Updated At",
    ]);

    const rows = contacts.map((c: typeof contacts[number]) =>
      toCsvRow([
        c.id,
        c.firstName,
        c.lastName,
        c.email,
        c.phone,
        c.title,
        c.company?.name,
        c.owner?.fullName,
        c.tags.map((t: typeof c.tags[number]) => t.tag.name).join("; "),
        c.source,
        c.linkedinUrl,
        c.twitterHandle,
        c.notes,
        c.isArchived ? "true" : "false",
        c.createdAt.toISOString(),
        c.updatedAt.toISOString(),
      ])
    );

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

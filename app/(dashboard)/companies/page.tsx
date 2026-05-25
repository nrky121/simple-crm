import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompaniesTable } from "@/components/companies/CompaniesTable";

export default async function CompaniesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      take: 26,
      where: { isArchived: false },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { contacts: true, deals: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.company.count({ where: { isArchived: false } }),
  ]);

  const hasMore = companies.length > 25;
  const items = hasMore ? companies.slice(0, 25) : companies;
  const nextCursor = hasMore
    ? Buffer.from(
        JSON.stringify({
          id: items[items.length - 1].id,
          createdAt: items[items.length - 1].createdAt.toISOString(),
        })
      ).toString("base64")
    : null;

  return (
    <CompaniesTable
      initialData={{ items, meta: { nextCursor, total } }}
    />
  );
}

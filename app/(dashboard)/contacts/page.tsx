import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContactsTable } from "@/components/contacts/ContactsTable";

export default async function ContactsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      take: 26,
      where: { isArchived: false },
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, fullName: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.count({ where: { isArchived: false } }),
  ]);

  const hasMore = contacts.length > 25;
  const items = hasMore ? contacts.slice(0, 25) : contacts;
  const nextCursor = hasMore
    ? Buffer.from(
        JSON.stringify({
          id: items[items.length - 1].id,
          createdAt: items[items.length - 1].createdAt.toISOString(),
        })
      ).toString("base64")
    : null;

  return (
    <ContactsTable
      initialData={{ items, meta: { nextCursor, total } }}
    />
  );
}

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  formatFullName,
  formatDate,
} from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/common/TagBadge";
import { ContactDetailActions } from "@/components/contacts/ContactDetailActions";
import { ContactTasksPanel } from "@/components/contacts/ContactTasksPanel";
import { ContactActivitiesPanel } from "@/components/contacts/ContactActivitiesPanel";
import {
  Building2,
  Mail,
  Phone,
  Briefcase,
  ArrowLeft,
  Calendar,
  Activity,
  CheckSquare,
  TrendingUp,
} from "lucide-react";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { id: true, fullName: true } },
      tags: { include: { tag: true } },
      activities: {
        take: 10,
        orderBy: { occurredAt: "desc" },
        include: {
          createdBy: { select: { id: true, fullName: true } },
        },
      },
      tasks: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        take: 50,
        include: {
          assignee: { select: { id: true, fullName: true } },
        },
      },
      deals: {
        include: {
          deal: {
            select: {
              id: true,
              title: true,
              stage: true,
              value: true,
              currency: true,
            },
          },
        },
      },
    },
  });

  if (!contact || contact.isArchived) notFound();

  const fullName = formatFullName(contact.firstName, contact.lastName);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back link + header */}
      <div>
        <Link
          href="/contacts"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Contacts
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
            {contact.title && (
              <p className="text-muted-foreground">{contact.title}</p>
            )}
          </div>
          <ContactDetailActions contact={contact} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Contact info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${contact.email}`} className="hover:underline truncate">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${contact.phone}`} className="hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.title && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{contact.title}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  Added {formatDate(contact.createdAt)}
                </span>
              </div>
              {contact.owner && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Owner:</span>
                  <span>{contact.owner.fullName ?? "—"}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company */}
          {contact.company && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Company</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/companies/${contact.company.id}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {contact.company.name}
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {contact.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map(({ tag }: { tag: { id: string; name: string; color: string } }) => (
                    <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {contact.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Deals */}
          {contact.deals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Deals ({contact.deals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {contact.deals.map(({ deal }: { deal: { id: string; title: string; stage: string; value: unknown; currency: string | null } }) => (
                    <li
                      key={deal.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <span className="text-sm font-medium">{deal.title}</span>
                      <Badge variant="secondary">{deal.stage}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="h-4 w-4" />
                Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContactTasksPanel
                contactId={contact.id}
                initialTasks={contact.tasks.map((t: { id: string; title: string; status: string; priority: string; dueDate: Date | null }) => ({
                  ...t,
                  dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                }))}
              />
            </CardContent>
          </Card>

          {/* Activity timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContactActivitiesPanel
                contactId={contact.id}
                initialActivities={contact.activities.map((a: { id: string; type: string; subject: string; body: string | null; occurredAt: Date; createdBy: { id: string; fullName: string | null } | null }) => ({
                  ...a,
                  occurredAt: a.occurredAt.toISOString(),
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatFullName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/common/TagBadge";
import { CompanyDetailActions } from "@/components/companies/CompanyDetailActions";
import {
  Globe,
  Building2,
  MapPin,
  Users,
  TrendingUp,
  ArrowLeft,
  Calendar,
  Briefcase,
} from "lucide-react";

export default async function CompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      tags: { include: { tag: true } },
      contacts: {
        where: { isArchived: false },
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { id: true, fullName: true } },
          tags: { include: { tag: true } },
        },
      },
      deals: {
        where: { isArchived: false },
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          stage: true,
          value: true,
          currency: true,
          expectedCloseDate: true,
        },
      },
      _count: { select: { contacts: true, deals: true } },
    },
  });

  if (!company || company.isArchived) notFound();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back link + header */}
      <div>
        <Link
          href="/companies"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Companies
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
            {company.industry && (
              <p className="text-muted-foreground">{company.industry}</p>
            )}
          </div>
          <CompanyDetailActions company={company} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Company info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {company.domain && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={company.website ?? `https://${company.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline truncate"
                  >
                    {company.domain}
                  </a>
                </div>
              )}
              {company.size && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{company.size}</span>
                </div>
              )}
              {(company.city || company.country) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    {[company.city, company.country].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
              {company.industry && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{company.industry}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  Added {formatDate(company.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {company.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {company.tags.map(({ tag }: { tag: { id: string; name: string; color: string } }) => (
                    <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {company.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {company.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Contacts ({company._count.contacts})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contacts yet.
                </p>
              ) : (
                <ul className="divide-y">
                  {company.contacts.map((contact: {
                      id: string;
                      firstName: string;
                      lastName: string | null;
                      title: string | null;
                      owner: { id: string; fullName: string | null } | null;
                      tags: { tag: { id: string; name: string; color: string } }[];
                    }) => (
                    <li
                      key={contact.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {formatFullName(contact.firstName, contact.lastName)}
                        </Link>
                        {contact.title && (
                          <p className="text-xs text-muted-foreground">
                            {contact.title}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.tags.slice(0, 2).map(({ tag }: { tag: { id: string; name: string; color: string } }) => (
                          <TagBadge
                            key={tag.id}
                            name={tag.name}
                            color={tag.color}
                          />
                        ))}
                        {contact.owner?.fullName && (
                          <span className="text-xs text-muted-foreground">
                            {contact.owner.fullName}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Deals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Deals ({company._count.deals})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deals yet.</p>
              ) : (
                <ul className="space-y-2">
                  {company.deals.map((deal) => (
                    <li
                      key={deal.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div>
                        <span className="text-sm font-medium">{deal.title}</span>
                        {deal.expectedCloseDate && (
                          <p className="text-xs text-muted-foreground">
                            Close: {formatDate(deal.expectedCloseDate)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {deal.value !== null && (
                          <span className="text-sm tabular-nums">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: deal.currency ?? "USD",
                              minimumFractionDigits: 0,
                            }).format(Number(deal.value))}
                          </span>
                        )}
                        <Badge variant="secondary">{deal.stage}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

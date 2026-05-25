"use client";

import { useState } from "react";
import Link from "next/link";
import { useCompanies, useDeleteCompany } from "@/hooks/useCompanies";
import { useTags } from "@/hooks/useTags";
import { useFilters } from "@/hooks/useFilters";
import { CompanyForm } from "./CompanyForm";
import { SlideOver } from "@/components/common/SlideOver";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { TagBadge } from "@/components/common/TagBadge";
import { CursorPagination } from "@/components/common/CursorPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  Building2,
  Search,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface CompanyRow {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  country: string | null;
  city: string | null;
  notes: string | null;
  tags: Array<{ tag: Tag }>;
  _count?: { contacts: number; deals: number };
  createdAt: string | Date;
}

interface InitialData {
  items: CompanyRow[];
  meta: { nextCursor: string | null; total: number };
}

interface CompaniesTableProps {
  initialData: InitialData;
}

export function CompaniesTable({ initialData }: CompaniesTableProps) {
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<CompanyRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CompanyRow | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const { filters, setFilter, resetFilters } = useFilters<{
    search: string | undefined;
    tagId: string | undefined;
    industry: string | undefined;
    cursor: string | undefined;
  }>({
    search: undefined,
    tagId: undefined,
    industry: undefined,
    cursor: undefined,
  });

  const isBaseQuery =
    filters.search === undefined &&
    filters.tagId === undefined &&
    filters.industry === undefined &&
    filters.cursor === undefined;

  const { data, isLoading } = useCompanies(
    filters as Record<string, string | undefined>,
    {
      initialData: isBaseQuery
        ? { items: initialData.items as never, meta: initialData.meta }
        : undefined,
    }
  );

  const { data: tagsData } = useTags();
  const deleteCompany = useDeleteCompany();

  const items: CompanyRow[] = (data?.items as CompanyRow[] | undefined) ?? [];
  const meta = data?.meta ?? initialData.meta;

  function handleNew() {
    setEditCompany(null);
    setSlideOverOpen(true);
  }

  function handleEdit(company: CompanyRow) {
    setEditCompany(company);
    setSlideOverOpen(true);
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    try {
      await deleteCompany.mutateAsync(archiveTarget.id);
      toast.success(`${archiveTarget.name} archived`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive company");
    } finally {
      setArchiveTarget(null);
    }
  }

  function handleNext(cursor: string) {
    setCursorStack((prev) => [...prev, filters.cursor ?? ""]);
    setFilter("cursor", cursor);
  }

  function handlePrev() {
    const stack = [...cursorStack];
    const prev = stack.pop() ?? undefined;
    setCursorStack(stack);
    setFilter("cursor", prev);
  }

  const hasActiveFilters = !!(filters.search || filters.tagId || filters.industry);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Company
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search companies…"
                value={filters.search ?? ""}
                onChange={(e) => {
                  setFilter("search", e.target.value || undefined);
                  setFilter("cursor", undefined);
                  setCursorStack([]);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={filters.tagId ?? ""}
              onValueChange={(val) => {
                setFilter("tagId", val || undefined);
                setFilter("cursor", undefined);
                setCursorStack([]);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All tags</SelectItem>
                {tagsData?.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetFilters();
                  setCursorStack([]);
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {items.length === 0 && !isLoading ? (
            <EmptyState
              icon={Building2}
              title="No companies found"
              description={
                hasActiveFilters
                  ? "Try adjusting your filters."
                  : "Add your first company to get started."
              }
              action={
                hasActiveFilters
                  ? undefined
                  : { label: "New Company", onClick: handleNew }
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Contacts</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/companies/${company.id}`}
                          className="hover:underline"
                        >
                          {company.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {company.domain ? (
                          <a
                            href={
                              company.website ??
                              `https://${company.domain}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline text-muted-foreground"
                          >
                            {company.domain}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {company.industry ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {company.size ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {company._count?.contacts ?? 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {company.tags.map(({ tag }) => (
                            <TagBadge
                              key={tag.id}
                              name={tag.name}
                              color={tag.color}
                            />
                          ))}
                          {company.tags.length === 0 && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(company.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(company)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setArchiveTarget(company)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t px-4">
                <CursorPagination
                  nextCursor={meta.nextCursor}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  hasPrev={cursorStack.length > 0}
                  total={meta.total}
                  showing={items.length}
                  loading={isLoading}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SlideOver
        open={slideOverOpen}
        onOpenChange={setSlideOverOpen}
        title={editCompany ? "Edit Company" : "New Company"}
      >
        <CompanyForm
          company={editCompany ?? undefined}
          onSuccess={() => setSlideOverOpen(false)}
        />
      </SlideOver>

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive company?"
        description={`${archiveTarget?.name} will be hidden from all lists. You can restore it later.`}
        confirmLabel="Archive"
        destructive
        onConfirm={handleArchive}
        loading={deleteCompany.isPending}
      />
    </div>
  );
}

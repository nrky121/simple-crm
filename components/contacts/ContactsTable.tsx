"use client";

import { useState } from "react";
import Link from "next/link";
import { useContacts, useDeleteContact } from "@/hooks/useContacts";
import { useTags } from "@/hooks/useTags";
import { useFilters } from "@/hooks/useFilters";
import { ContactForm } from "./ContactForm";
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
  Users,
  Search,
  X,
} from "lucide-react";
import { formatFullName, formatDate } from "@/lib/format";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ContactRow {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  title: string | null;
  company?: { id: string; name: string } | null;
  owner?: { id: string; fullName: string | null } | null;
  tags: Array<{ tag: Tag }>;
  createdAt: string | Date;
}

interface InitialData {
  items: ContactRow[];
  meta: { nextCursor: string | null; total: number };
}

interface ContactsTableProps {
  initialData: InitialData;
}

export function ContactsTable({ initialData }: ContactsTableProps) {
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [editContact, setEditContact] = useState<ContactRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ContactRow | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const { filters, setFilter, resetFilters } = useFilters<{
    search: string | undefined;
    tagId: string | undefined;
    cursor: string | undefined;
  }>({ search: undefined, tagId: undefined, cursor: undefined });

  const isBaseQuery =
    filters.search === undefined &&
    filters.tagId === undefined &&
    filters.cursor === undefined;

  const { data, isLoading } = useContacts(
    filters as Record<string, string | undefined>,
    {
      initialData: isBaseQuery
        ? { items: initialData.items as never, meta: initialData.meta }
        : undefined,
    }
  );

  const { data: tagsData } = useTags();
  const deleteContact = useDeleteContact();

  const items: ContactRow[] = (data?.items as ContactRow[] | undefined) ?? [];
  const meta = data?.meta ?? initialData.meta;

  function handleNew() {
    setEditContact(null);
    setSlideOverOpen(true);
  }

  function handleEdit(contact: ContactRow) {
    setEditContact(contact);
    setSlideOverOpen(true);
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    try {
      await deleteContact.mutateAsync(archiveTarget.id);
      toast.success(`${formatFullName(archiveTarget.firstName, archiveTarget.lastName)} archived`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive contact");
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

  const hasActiveFilters = !!(filters.search || filters.tagId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Contact
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search contacts…"
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
              value={filters.tagId ?? "all"}
              onValueChange={(val) => {
                setFilter("tagId", val === "all" ? undefined : val);
                setFilter("cursor", undefined);
                setCursorStack([]);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
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
              icon={Users}
              title="No contacts found"
              description={
                hasActiveFilters
                  ? "Try adjusting your filters."
                  : "Add your first contact to get started."
              }
              action={hasActiveFilters ? undefined : { label: "New Contact", onClick: handleNew }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="hover:underline"
                        >
                          {formatFullName(contact.firstName, contact.lastName)}
                        </Link>
                        {contact.title && (
                          <p className="text-xs text-muted-foreground">
                            {contact.title}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.company ? (
                          <Link
                            href={`/companies/${contact.company.id}`}
                            className="hover:underline text-sm"
                          >
                            {contact.company.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-sm hover:underline"
                          >
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map(({ tag }) => (
                            <TagBadge
                              key={tag.id}
                              name={tag.name}
                              color={tag.color}
                            />
                          ))}
                          {contact.tags.length === 0 && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {contact.owner?.fullName ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(contact.createdAt)}
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
                              onClick={() => handleEdit(contact)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setArchiveTarget(contact)}
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
        title={editContact ? "Edit Contact" : "New Contact"}
      >
        <ContactForm
          contact={editContact ?? undefined}
          onSuccess={() => setSlideOverOpen(false)}
        />
      </SlideOver>

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive contact?"
        description={`${formatFullName(archiveTarget?.firstName, archiveTarget?.lastName)} will be hidden from all lists. You can restore them later.`}
        confirmLabel="Archive"
        destructive
        onConfirm={handleArchive}
        loading={deleteContact.isPending}
      />
    </div>
  );
}

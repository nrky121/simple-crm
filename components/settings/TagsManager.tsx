"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useTags } from "@/hooks/useTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

interface TagRow {
  id: string;
  name: string;
  color: string;
}

interface TagsManagerProps {
  initialTags: TagRow[];
  isAdmin: boolean;
}

const tagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
});

type TagFormValues = z.infer<typeof tagSchema>;

export function TagsManager({ initialTags, isAdmin }: TagsManagerProps) {
  const queryClient = useQueryClient();
  const { data: tagsData } = useTags();
  const tags: TagRow[] = tagsData ?? initialTags;

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TagRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tags/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to delete tag");
      }
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success(`Tag "${deleteTarget.name}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tag");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (!isAdmin) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Only admins can manage tags.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tags</h2>
          <p className="text-sm text-muted-foreground">
            Manage tags for contacts and companies.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Tag
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {tags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Tag className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No tags yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first tag to organise records.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Color</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <span
                        className="inline-block h-4 w-4 rounded-full border"
                        style={{ backgroundColor: tag.color }}
                        title={tag.color}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{tag.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditTarget(tag)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(tag)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <TagDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["tags"] });
          setCreateOpen(false);
        }}
      />

      {/* Edit dialog */}
      {editTarget && (
        <TagDialog
          open
          tag={editTarget}
          onOpenChange={(open) => !open && setEditTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["tags"] });
            setEditTarget(null);
          }}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete tag "${deleteTarget?.name}"?`}
        description="This will remove the tag from all contacts and companies. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

// ─── TagDialog ────────────────────────────────────────────────────────────────

interface TagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: TagRow;
  onSuccess: () => void;
}

function TagDialog({ open, onOpenChange, tag, onSuccess }: TagDialogProps) {
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: tag?.name ?? "",
      color: tag?.color ?? "#6366f1",
    },
  });

  async function onSubmit(values: TagFormValues) {
    try {
      const url = tag ? `/api/tags/${tag.id}` : "/api/tags";
      const method = tag ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to save tag");
      }
      toast.success(tag ? "Tag updated" : "Tag created");
      form.reset({ name: "", color: "#6366f1" });
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{tag ? "Edit Tag" : "New Tag"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Customer, Partner…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border p-1"
                      />
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="#6366f1"
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving…"
                  : tag
                  ? "Save Changes"
                  : "Create Tag"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

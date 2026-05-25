import { z } from "zod";

export const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  title: z.string().max(150).optional(),
  companyId: z.string().uuid("Invalid company ID").optional(),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitterHandle: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  source: z.string().max(100).optional(),
  ownerId: z.string().uuid().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const contactFiltersSchema = z.object({
  search: z.string().optional(),
  companyId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  isArchived: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  cursor: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "firstName", "lastName", "email"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const bulkContactSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "Select at least one contact"),
  action: z.enum(["archive", "unarchive", "assign", "tag", "untag"]),
  ownerId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactFilters = z.infer<typeof contactFiltersSchema>;
export type BulkContactInput = z.infer<typeof bulkContactSchema>;

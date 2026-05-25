import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  domain: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  size: z
    .enum([
      "SOLO",
      "SMALL",
      "MEDIUM",
      "LARGE",
      "ENTERPRISE",
    ])
    .optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  ownerId: z.string().uuid().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const companyFiltersSchema = z.object({
  search: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  isArchived: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  cursor: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CompanyFilters = z.infer<typeof companyFiltersSchema>;

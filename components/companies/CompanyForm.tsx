"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCompany, useUpdateCompany } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const COMPANY_SIZES = [
  { value: "SOLO", label: "Solo (1)" },
  { value: "SMALL", label: "Small (2–50)" },
  { value: "MEDIUM", label: "Medium (51–200)" },
  { value: "LARGE", label: "Large (201–1000)" },
  { value: "ENTERPRISE", label: "Enterprise (1000+)" },
];

const schema = z.object({
  name: z.string().min(1, "Company name is required"),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  country: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CompanyFormProps {
  company?: {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    size: string | null;
    website: string | null;
    country: string | null;
    city: string | null;
    notes: string | null;
  };
  onSuccess?: () => void;
}

export function CompanyForm({ company, onSuccess }: CompanyFormProps) {
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: company?.name ?? "",
      domain: company?.domain ?? "",
      industry: company?.industry ?? "",
      size: company?.size ?? "",
      website: company?.website ?? "",
      country: company?.country ?? "",
      city: company?.city ?? "",
      notes: company?.notes ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      name: company?.name ?? "",
      domain: company?.domain ?? "",
      industry: company?.industry ?? "",
      size: company?.size ?? "",
      website: company?.website ?? "",
      country: company?.country ?? "",
      city: company?.city ?? "",
      notes: company?.notes ?? "",
    });
  }, [company, form]);

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      domain: values.domain || undefined,
      industry: values.industry || undefined,
      size: values.size || undefined,
      website: values.website || undefined,
      country: values.country || undefined,
      city: values.city || undefined,
      notes: values.notes || undefined,
    };

    try {
      if (company) {
        await updateCompany.mutateAsync({ id: company.id, ...payload });
        toast.success("Company updated");
      } else {
        await createCompany.mutateAsync(payload);
        toast.success("Company created");
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const isPending = createCompany.isPending || updateCompany.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name *</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domain</FormLabel>
              <FormControl>
                <Input placeholder="acme.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry</FormLabel>
              <FormControl>
                <Input placeholder="Software, Finance…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Size</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(val) =>
                  field.onChange(val === "_none" ? "" : val)
                }
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_none">Unknown</SelectItem>
                  {COMPANY_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://acme.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="San Francisco" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder="USA" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any notes about this company…"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? company
                ? "Saving…"
                : "Creating…"
              : company
              ? "Save Changes"
              : "Create Company"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

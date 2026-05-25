"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateContact, useUpdateContact } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
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

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  companyId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ContactFormProps {
  contact?: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone?: string | null;
    title: string | null;
    company?: { id: string; name: string } | null;
    notes?: string | null;
  };
  onSuccess?: () => void;
}

export function ContactForm({ contact, onSuccess }: ContactFormProps) {
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const { data: companiesData } = useCompanies();

  const companies = (companiesData?.items as Array<{ id: string; name: string }> | undefined) ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: contact?.firstName ?? "",
      lastName: contact?.lastName ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      title: contact?.title ?? "",
      companyId: contact?.company?.id ?? "",
      notes: contact?.notes ?? "",
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        firstName: contact.firstName ?? "",
        lastName: contact.lastName ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        title: contact.title ?? "",
        companyId: contact.company?.id ?? "",
        notes: contact.notes ?? "",
      });
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        title: "",
        companyId: "",
        notes: "",
      });
    }
  }, [contact, form]);

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      lastName: values.lastName || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      title: values.title || undefined,
      companyId: values.companyId || undefined,
      notes: values.notes || undefined,
    };

    try {
      if (contact) {
        await updateContact.mutateAsync({ id: contact.id, ...payload });
        toast.success("Contact updated");
      } else {
        await createContact.mutateAsync(payload);
        toast.success("Contact created");
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const isPending = createContact.isPending || updateContact.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Jane" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="jane@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+1 555 000 0000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input placeholder="CEO" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(val) => field.onChange(val === "_none" ? "" : val)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_none">No company</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any notes about this contact…"
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
              ? contact
                ? "Saving…"
                : "Creating…"
              : contact
              ? "Save Changes"
              : "Create Contact"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

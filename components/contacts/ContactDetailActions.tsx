"use client";

import { useState } from "react";
import { SlideOver } from "@/components/common/SlideOver";
import { ContactForm } from "./ContactForm";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface ContactDetailActionsProps {
  contact: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone?: string | null;
    title: string | null;
    company?: { id: string; name: string } | null;
    notes?: string | null;
  };
}

export function ContactDetailActions({ contact }: ContactDetailActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </Button>

      <SlideOver
        open={open}
        onOpenChange={setOpen}
        title="Edit Contact"
      >
        <ContactForm contact={contact} onSuccess={() => setOpen(false)} />
      </SlideOver>
    </>
  );
}

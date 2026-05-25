"use client";

import { useState } from "react";
import { SlideOver } from "@/components/common/SlideOver";
import { CompanyForm } from "./CompanyForm";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface CompanyDetailActionsProps {
  company: {
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
}

export function CompanyDetailActions({ company }: CompanyDetailActionsProps) {
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
        title="Edit Company"
      >
        <CompanyForm company={company} onSuccess={() => setOpen(false)} />
      </SlideOver>
    </>
  );
}

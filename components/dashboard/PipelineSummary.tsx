"use client";

import { formatCurrency } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PipelineStage {
  stage: string;
  _count: { id: number };
  _sum: { value: { toNumber?: () => number } | number | null };
}

interface PipelineSummaryProps {
  stages: PipelineStage[];
}

const STAGE_LABELS: Record<string, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

const STAGE_ORDER = [
  "LEAD",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

const STAGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  LEAD: "secondary",
  QUALIFIED: "secondary",
  PROPOSAL: "default",
  NEGOTIATION: "default",
  CLOSED_WON: "default",
  CLOSED_LOST: "destructive",
};

export function PipelineSummary({ stages }: PipelineSummaryProps) {
  const sorted = [...stages].sort(
    (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
  );

  const totalDeals = sorted.reduce((sum, s) => sum + s._count.id, 0);
  const totalValue = sorted.reduce(
    (sum, s) => sum + Number(s._sum.value ?? 0),
    0
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No deals yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Stage</TableHead>
          <TableHead className="text-right">Deals</TableHead>
          <TableHead className="text-right">Total Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.stage}>
            <TableCell>
              <Badge variant={STAGE_VARIANT[row.stage] ?? "outline"}>
                {STAGE_LABELS[row.stage] ?? row.stage}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row._count.id}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(Number(row._sum.value ?? 0))}
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="font-medium border-t-2">
          <TableCell>Total</TableCell>
          <TableCell className="text-right tabular-nums">{totalDeals}</TableCell>
          <TableCell className="text-right tabular-nums">
            {formatCurrency(totalValue)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency, formatFullName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, TrendingUp, CheckSquare } from "lucide-react";
import { PipelineSummary } from "@/components/dashboard/PipelineSummary";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { UpcomingTasks } from "@/components/dashboard/UpcomingTasks";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbg = async <T,>(label: string, p: Promise<T>) =>
    p.catch((e: unknown) => { const err = e as Record<string,unknown>; console.error(`[dash:${label}]`, err?.code, err?.message); throw e; });

  const [contactCount, companyCount, pipeline, recentActivities, upcomingTasks] =
    await Promise.all([
      dbg("contact.count", prisma.contact.count({ where: { isArchived: false } })),
      dbg("company.count", prisma.company.count({ where: { isArchived: false } })),
      dbg("deal.groupBy", prisma.deal.groupBy({
        by: ["stage"],
        where: { isArchived: false },
        _count: { id: true },
        _sum: { value: true },
      })),
      dbg("activity.findMany", prisma.activity.findMany({
        take: 10,
        orderBy: { occurredAt: "desc" },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      })),
      dbg("task.findMany", prisma.task.findMany({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
          dueDate: { gte: new Date() },
        },
        take: 10,
        orderBy: { dueDate: "asc" },
        include: {
          assignee: { select: { id: true, fullName: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      })),
    ]);

  type PipelineRow = { _count: { id: number }; _sum: { value: unknown } };
  const totalDeals = (pipeline as PipelineRow[]).reduce(
    (sum, s) => sum + s._count.id,
    0
  );
  const totalPipelineValue = (pipeline as PipelineRow[]).reduce(
    (sum, s) => sum + Number(s._sum.value ?? 0),
    0
  );
  const openTaskCount = upcomingTasks.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {formatFullName(user.email?.split("@")[0], null)}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contactCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active contacts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPipelineValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalDeals} active deal{totalDeals !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTaskCount}</div>
            <p className="text-xs text-muted-foreground">Open or in progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline summary */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineSummary stages={pipeline} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity activities={recentActivities} />
          </CardContent>
        </Card>

        {/* Upcoming tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingTasks tasks={upcomingTasks} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET() {
  try {
    await getCurrentUser();

    const [pipeline, recentActivities, upcomingTasks] = await Promise.all([
      prisma.deal.groupBy({
        by: ["stage"],
        where: { isArchived: false },
        _count: { id: true },
        _sum: { value: true },
      }),
      prisma.activity.findMany({
        take: 10,
        orderBy: { occurredAt: "desc" },
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true },
          },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.task.findMany({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
          dueDate: { gte: new Date() },
        },
        take: 10,
        orderBy: { dueDate: "asc" },
        include: {
          assignee: { select: { id: true, fullName: true } },
          contact: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    const pipelineFormatted = pipeline.map((p: typeof pipeline[number]) => ({
      stage: p.stage,
      count: p._count.id,
      totalValue: p._sum.value ? Number(p._sum.value) : 0,
    }));

    return successResponse({
      pipeline: pipelineFormatted,
      recentActivities,
      upcomingTasks,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

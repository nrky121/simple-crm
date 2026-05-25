import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { AsyncLocalStorage } from "async_hooks";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof buildPrismaClient> | undefined;
};

// AsyncLocalStorage holds the user ID for the current request (for audit logs)
export const auditUserStorage = new AsyncLocalStorage<{ userId: string }>();

function buildPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  const base = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  // Audit log extension — Prisma 7 uses $extends instead of $use
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);

          const auditableModels = [
            "Contact",
            "Company",
            "Deal",
            "Task",
            "Activity",
            "Tag",
          ];
          const auditableActions = [
            "create",
            "update",
            "delete",
            "createMany",
            "updateMany",
            "deleteMany",
          ];

          if (
            model &&
            auditableModels.includes(model) &&
            auditableActions.includes(operation)
          ) {
            const store = auditUserStorage.getStore();
            if (store?.userId) {
              const resultAny = result as { id?: string } | null;
              const recordId =
                resultAny?.id ??
                (args as { where?: { id?: string } })?.where?.id ??
                "batch";
              try {
                await base.auditLog.create({
                  data: {
                    userId: store.userId,
                    model: model,
                    recordId: String(recordId),
                    action: operation.toUpperCase(),
                    changes: args as object,
                  },
                });
              } catch {
                // Never let audit failure break the main operation
              }
            }
          }

          return result;
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

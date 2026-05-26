import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
  const prisma = new PrismaClient({ adapter } as any);
  const cols = await (prisma as any).$queryRawUnsafe(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_name IN ('contacts', 'profiles', 'companies', 'tasks')
    ORDER BY table_name, ordinal_position
  `);
  console.log(JSON.stringify(cols, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);

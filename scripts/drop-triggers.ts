import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
  const prisma = new PrismaClient({ adapter } as any);

  console.log("Dropping broken search triggers...");

  await (prisma as any).$executeRawUnsafe(`DROP TRIGGER IF EXISTS contacts_search_update ON contacts`);
  console.log("✓ Dropped contacts_search_update");

  await (prisma as any).$executeRawUnsafe(`DROP TRIGGER IF EXISTS companies_search_update ON companies`);
  console.log("✓ Dropped companies_search_update");

  // Also drop the trigger functions to clean up completely
  await (prisma as any).$executeRawUnsafe(`DROP FUNCTION IF EXISTS update_contact_search_vector() CASCADE`);
  console.log("✓ Dropped update_contact_search_vector function");

  await (prisma as any).$executeRawUnsafe(`DROP FUNCTION IF EXISTS update_company_search_vector() CASCADE`);
  console.log("✓ Dropped update_company_search_vector function");

  await prisma.$disconnect();
  console.log("Done.");
}
main().catch(console.error);

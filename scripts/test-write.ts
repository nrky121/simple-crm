import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter } as any);

  console.log("Testing company create via POOLER url...");
  try {
    const c = await prisma.company.create({
      data: { name: "_test_delete_me" },
    });
    console.log("SUCCESS:", c.id);
    await prisma.company.delete({ where: { id: c.id } });
    console.log("Cleanup done");
  } catch (e: any) {
    console.error("FAIL:", e.message);
    console.error("Meta:", JSON.stringify(e.meta));
  }
  await prisma.$disconnect();
}
main().catch(console.error);

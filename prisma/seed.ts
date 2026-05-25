/**
 * Seed script — run with: pnpm db:seed
 *
 * Creates:
 *   - 1 admin user (via Supabase Auth)
 *   - 10 companies
 *   - 50 contacts
 *   - 5 tags
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { PrismaClient } from "@prisma/client";
import { createAdminClient } from "../lib/supabase/admin";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Education",
  "Consulting",
  "Real Estate",
];

const COMPANY_SIZES = [
  "SOLO",
  "SMALL",
  "MEDIUM",
  "LARGE",
  "ENTERPRISE",
] as const;

const TAG_DATA = [
  { name: "VIP", color: "#f59e0b" },
  { name: "Hot Lead", color: "#ef4444" },
  { name: "Nurture", color: "#3b82f6" },
  { name: "Partner", color: "#10b981" },
  { name: "Churned", color: "#6b7280" },
];

async function main() {
  const supabase = createAdminClient();

  console.log("🌱 Starting seed...");

  // ── Admin user ───────────────────────────────────────────────────────────
  const adminEmail = "admin@example.com";
  const adminPassword = "password123!";

  let adminUserId: string;

  // Check if admin already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingAdmin = existingUsers?.users?.find(
    (u) => u.email === adminEmail
  );

  if (existingAdmin) {
    adminUserId = existingAdmin.id;
    console.log(`  ✓ Admin user already exists: ${adminEmail}`);
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "Admin User" },
    });

    if (error) throw new Error(`Failed to create admin user: ${error.message}`);
    adminUserId = newUser.user.id;
    console.log(`  ✓ Created admin user: ${adminEmail}`);
  }

  // Upsert profile with ADMIN role
  await prisma.profile.upsert({
    where: { id: adminUserId },
    create: {
      id: adminUserId,
      email: adminEmail,
      fullName: "Admin User",
      role: "ADMIN",
      isActive: true,
    },
    update: { role: "ADMIN", isActive: true },
  });

  // ── Tags ─────────────────────────────────────────────────────────────────
  const tags = await Promise.all(
    TAG_DATA.map((tag) =>
      prisma.tag.upsert({
        where: { name: tag.name },
        create: tag,
        update: {},
      })
    )
  );
  console.log(`  ✓ Upserted ${tags.length} tags`);

  // ── Companies ────────────────────────────────────────────────────────────
  const companies = await Promise.all(
    Array.from({ length: 10 }).map(async () => {
      const name = faker.company.name();
      return prisma.company.create({
        data: {
          name,
          domain: faker.internet.domainName(),
          industry: faker.helpers.arrayElement(INDUSTRIES),
          size: faker.helpers.arrayElement(COMPANY_SIZES),
          website: faker.internet.url(),
          country: faker.location.country(),
          city: faker.location.city(),
          notes: faker.lorem.sentence(),
          ownerId: adminUserId,
        },
      });
    })
  );
  console.log(`  ✓ Created ${companies.length} companies`);

  // ── Contacts ─────────────────────────────────────────────────────────────
  const contacts = await Promise.all(
    Array.from({ length: 50 }).map(async (_, i) => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const company = faker.helpers.arrayElement(companies);
      const numTags = faker.number.int({ min: 0, max: 2 });
      const selectedTags = faker.helpers.arrayElements(tags, numTags);

      return prisma.contact.create({
        data: {
          firstName,
          lastName,
          email: faker.internet.email({ firstName, lastName }).toLowerCase(),
          phone: faker.phone.number(),
          title: faker.person.jobTitle(),
          companyId: company.id,
          notes: i % 5 === 0 ? faker.lorem.paragraph() : undefined,
          source: faker.helpers.arrayElement([
            "website",
            "referral",
            "linkedin",
            "cold outreach",
            "conference",
          ]),
          ownerId: adminUserId,
          tags: {
            create: selectedTags.map((tag) => ({ tagId: tag.id })),
          },
        },
      });
    })
  );
  console.log(`  ✓ Created ${contacts.length} contacts`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete!");
  console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
  console.log(
    `   Created: ${companies.length} companies, ${contacts.length} contacts, ${tags.length} tags`
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

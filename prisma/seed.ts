/**
 * Seed script — run with: pnpm db:seed
 *
 * Seeds data owned by the existing user (looked up by email).
 * Creates: 5 tags, 10 companies, 50 contacts, 20 deals,
 *          activities, and tasks.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createAdminClient } from "../lib/supabase/admin";
import { faker } from "@faker-js/faker";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const OWNER_EMAIL = "ryan@checkingin.co";

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

const DEAL_STAGES = [
  "LEAD",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;

const TAG_DATA = [
  { name: "VIP", color: "#f59e0b" },
  { name: "Hot Lead", color: "#ef4444" },
  { name: "Nurture", color: "#3b82f6" },
  { name: "Partner", color: "#10b981" },
  { name: "Churned", color: "#6b7280" },
];

const ACTIVITY_TYPES = ["EMAIL", "CALL", "MEETING", "NOTE"] as const;

const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "DONE"] as const;

async function main() {
  const supabase = createAdminClient();

  console.log("🌱 Starting seed...");

  // ── Resolve owner user ───────────────────────────────────────────────────
  const { data: listData } = await supabase.auth.admin.listUsers();
  const ownerUser = listData?.users?.find((u) => u.email === OWNER_EMAIL);

  if (!ownerUser) {
    throw new Error(
      `No Supabase auth user found for ${OWNER_EMAIL}. Log in once to create the account first.`
    );
  }

  const ownerId = ownerUser.id;

  // Ensure profile row exists
  await prisma.profile.upsert({
    where: { id: ownerId },
    create: {
      id: ownerId,
      email: OWNER_EMAIL,
      fullName: "Ryan",
      role: "ADMIN",
      isActive: true,
    },
    update: { role: "ADMIN", isActive: true },
  });

  console.log(`  ✓ Owner resolved: ${OWNER_EMAIL} (${ownerId})`);

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
  const companyNames = [
    "Acme Corp",
    "Bright Horizons",
    "Cascade Systems",
    "Dune Analytics",
    "Echo Ventures",
    "Frontier Labs",
    "Granite Partners",
    "Harbor Health",
    "Ironclad Finance",
    "Jetstream Media",
  ];

  const companies = await Promise.all(
    companyNames.map(async (name, i) => {
      const slug = name.toLowerCase().replace(/\s+/g, "");
      return prisma.company.create({
        data: {
          name,
          domain: `${slug}.com`,
          industry: INDUSTRIES[i % INDUSTRIES.length],
          size: COMPANY_SIZES[i % COMPANY_SIZES.length],
          website: `https://${slug}.com`,
          country: faker.helpers.arrayElement(["United States", "Canada", "United Kingdom", "Australia"]),
          city: faker.location.city(),
          notes: faker.lorem.sentence(),
          ownerId,
          tags: i < 4
            ? { create: [{ tagId: tags[i % tags.length].id }] }
            : undefined,
        },
      });
    })
  );
  console.log(`  ✓ Created ${companies.length} companies`);

  // ── Contacts ─────────────────────────────────────────────────────────────
  const contactData = [
    { firstName: "Sarah", lastName: "Chen", title: "VP of Engineering" },
    { firstName: "Marcus", lastName: "Williams", title: "CEO" },
    { firstName: "Priya", lastName: "Patel", title: "Head of Product" },
    { firstName: "James", lastName: "O'Brien", title: "Sales Director" },
    { firstName: "Leila", lastName: "Ahmadi", title: "CTO" },
    { firstName: "Tom", lastName: "Nakamura", title: "CFO" },
    { firstName: "Diana", lastName: "Rossi", title: "Marketing Manager" },
    { firstName: "Carlos", lastName: "Mendez", title: "Operations Lead" },
    { firstName: "Aisha", lastName: "Johnson", title: "Data Scientist" },
    { firstName: "Felix", lastName: "Wagner", title: "Product Manager" },
    { firstName: "Yuki", lastName: "Tanaka", title: "UX Designer" },
    { firstName: "Omar", lastName: "Hassan", title: "Backend Engineer" },
    { firstName: "Elena", lastName: "Kovacs", title: "Account Executive" },
    { firstName: "Raj", lastName: "Sharma", title: "Business Analyst" },
    { firstName: "Zoe", lastName: "Lambert", title: "Partnership Manager" },
  ];

  // Fill remaining 35 with faker
  for (let i = contactData.length; i < 50; i++) {
    contactData.push({
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      title: faker.person.jobTitle(),
    });
  }

  const contacts = await Promise.all(
    contactData.map(async ({ firstName, lastName, title }, i) => {
      const company = companies[i % companies.length];
      const numTags = faker.number.int({ min: 0, max: 2 });
      const selectedTags = faker.helpers.arrayElements(tags, numTags);

      return prisma.contact.create({
        data: {
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@${company.domain}`,
          phone: faker.phone.number({ style: "international" }),
          title,
          companyId: company.id,
          notes: i % 5 === 0 ? faker.lorem.paragraph() : undefined,
          source: faker.helpers.arrayElement([
            "website",
            "referral",
            "linkedin",
            "cold outreach",
            "conference",
          ]),
          ownerId,
          tags: {
            create: selectedTags.map((tag) => ({ tagId: tag.id })),
          },
        },
      });
    })
  );
  console.log(`  ✓ Created ${contacts.length} contacts`);

  // ── Deals ─────────────────────────────────────────────────────────────────
  const dealTitles = [
    "Enterprise License — Q3",
    "Platform Migration Project",
    "Annual Support Contract",
    "Consulting Engagement",
    "API Integration Deal",
    "Pilot Program",
    "Renewal — Pro Plan",
    "Custom Implementation",
    "Data Services Agreement",
    "Strategic Partnership",
    "SaaS Subscription Upgrade",
    "Professional Services",
    "Training & Onboarding",
    "Managed Services Contract",
    "New Logo — SMB",
    "Expansion Seat Upsell",
    "Hardware + Software Bundle",
    "Security Audit Project",
    "Co-marketing Agreement",
    "Joint Venture Deal",
  ];

  const deals = await Promise.all(
    dealTitles.map(async (title, i) => {
      const stage = DEAL_STAGES[i % DEAL_STAGES.length];
      const company = companies[i % companies.length];
      const contact = contacts[i % contacts.length];
      const value = faker.number.int({ min: 5000, max: 250000 });
      const isClosedWon = stage === "CLOSED_WON";
      const isClosedLost = stage === "CLOSED_LOST";

      return prisma.deal.create({
        data: {
          title,
          value,
          currency: "USD",
          stage,
          probability: isClosedWon ? 100 : isClosedLost ? 0 : faker.number.int({ min: 10, max: 90 }),
          expectedCloseDate: faker.date.soon({ days: 90 }),
          closedAt: isClosedWon || isClosedLost ? faker.date.recent({ days: 30 }) : undefined,
          notes: i % 3 === 0 ? faker.lorem.sentence() : undefined,
          companyId: company.id,
          ownerId,
          contacts: {
            create: [{ contactId: contact.id, isPrimary: true }],
          },
        },
      });
    })
  );
  console.log(`  ✓ Created ${deals.length} deals`);

  // ── Activities ────────────────────────────────────────────────────────────
  const activitySubjects = {
    EMAIL: ["Intro email sent", "Follow-up on proposal", "Contract attached", "Checking in"],
    CALL: ["Discovery call", "Demo walkthrough", "Pricing discussion", "Renewal call"],
    MEETING: ["Kick-off meeting", "QBR session", "Executive sponsor intro", "Product demo"],
    NOTE: ["Left voicemail", "LinkedIn connection sent", "Spoke at conference", "Referred by partner"],
  };

  const activities = await Promise.all(
    Array.from({ length: 30 }).map(async (_, i) => {
      const type = ACTIVITY_TYPES[i % ACTIVITY_TYPES.length];
      const subjects = activitySubjects[type];
      const contact = contacts[i % contacts.length];

      return prisma.activity.create({
        data: {
          type,
          subject: subjects[i % subjects.length],
          body: faker.lorem.sentence(),
          occurredAt: faker.date.recent({ days: 60 }),
          createdById: ownerId,
          contactId: contact.id,
          companyId: contact.companyId ?? undefined,
          dealId: i < deals.length ? deals[i].id : undefined,
        },
      });
    })
  );
  console.log(`  ✓ Created ${activities.length} activities`);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const taskTitles = [
    "Send follow-up email",
    "Schedule product demo",
    "Prepare proposal",
    "Review contract terms",
    "Call decision maker",
    "Update CRM notes",
    "Send pricing deck",
    "Book intro call",
    "Check in after trial",
    "Request referral",
    "Research company background",
    "Draft SOW",
    "Send onboarding docs",
    "Close deal by end of quarter",
    "LinkedIn outreach",
  ];

  const tasks = await Promise.all(
    taskTitles.map(async (title, i) => {
      const status = TASK_STATUSES[i % TASK_STATUSES.length];
      const contact = contacts[i % contacts.length];

      return prisma.task.create({
        data: {
          title,
          description: i % 3 === 0 ? faker.lorem.sentence() : undefined,
          status,
          priority: TASK_PRIORITIES[i % TASK_PRIORITIES.length],
          dueDate: faker.date.soon({ days: 30 }),
          completedAt: status === "DONE" ? faker.date.recent({ days: 7 }) : undefined,
          assigneeId: ownerId,
          contactId: contact.id,
          dealId: i < deals.length ? deals[i].id : undefined,
        },
      });
    })
  );
  console.log(`  ✓ Created ${tasks.length} tasks`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete!");
  console.log(`   ${companies.length} companies · ${contacts.length} contacts · ${tags.length} tags`);
  console.log(`   ${deals.length} deals · ${activities.length} activities · ${tasks.length} tasks`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

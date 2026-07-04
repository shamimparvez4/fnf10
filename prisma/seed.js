// One-time migration/seed script.
// Run with: npm run db:seed
//
// - Creates the admin account from SEED_ADMIN_* env vars.
// - Recreates your 10 existing members with their real historical
//   paid/due month data, migrated from the original static dashboard.
// - Every member's initial password is set to their loginId (phone number),
//   exactly like the old file did. Tell each member to change it after
//   their first login (add a "change password" flow if you want to enforce this).
//
// Safe to re-run: it upserts by loginId, so it won't create duplicates.

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const seedMembers = require("./seed-data.json");

const prisma = new PrismaClient();

async function main() {
  const adminLoginId = process.env.SEED_ADMIN_LOGIN_ID;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME || "Admin";

  if (!adminLoginId || !adminPassword) {
    throw new Error(
      "Set SEED_ADMIN_LOGIN_ID and SEED_ADMIN_PASSWORD in your .env before seeding."
    );
  }

  const adminHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { loginId: adminLoginId },
    update: { password: adminHash, name: adminName, role: "ADMIN" },
    create: {
      loginId: adminLoginId,
      password: adminHash,
      name: adminName,
      role: "ADMIN",
    },
  });
  console.log(`Admin ready: ${adminLoginId}`);

  for (const member of seedMembers) {
    const hash = await bcrypt.hash(member.loginId, 10); // initial password = phone number
    const user = await prisma.user.upsert({
      where: { loginId: member.loginId },
      update: { name: member.name, role: "MEMBER" },
      create: {
        loginId: member.loginId,
        password: hash,
        name: member.name,
        role: "MEMBER",
      },
    });

    for (const m of member.months) {
      await prisma.monthRecord.upsert({
        where: {
          userId_year_monthIndex: {
            userId: user.id,
            year: m.year,
            monthIndex: m.monthIndex,
          },
        },
        update: { status: m.status, amount: m.amount, monthLabel: m.monthLabel },
        create: {
          userId: user.id,
          year: m.year,
          monthIndex: m.monthIndex,
          monthLabel: m.monthLabel,
          status: m.status,
          amount: m.amount,
        },
      });
    }
    console.log(`Migrated member: ${member.name} (${member.loginId})`);
  }

  console.log("\nSeed complete.");
  console.log("IMPORTANT: change the admin password after first login —");
  console.log("it was previously exposed in a public client-side HTML file.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, Role, SubscriptionStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Emails are stored canonicalized to lowercase across the app.
  const email = (process.env.SUPER_ADMIN_EMAIL ?? 'jameelahmedkalhoro@gmail.com').trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'Jameel@12345';
  const name = process.env.SUPER_ADMIN_NAME ?? 'Platform Owner';

  const passwordHash = await bcrypt.hash(password, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      schoolId: null,
    },
  });

  // A default subscription plan the super admin can assign to schools.
  const plan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan_starter' },
    update: {},
    create: {
      id: 'plan_starter',
      name: 'Starter (Monthly)',
      pricePkr: 5000,
      maxStudents: 300,
      maxTeachers: 30,
      features: { attendance: true, assignments: true, grades: true, portal: true },
    },
  });

  // A demo school + admin so the app is immediately explorable.
  const demoAdminPassword = 'Admin123!';
  const demoSchool = await prisma.school.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo School',
      slug: 'demo',
      city: 'Lahore',
      subscription: {
        create: { planId: plan.id, status: SubscriptionStatus.TRIALING },
      },
      users: {
        create: {
          name: 'Demo Admin',
          email: 'admin@demo.sms.local',
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
          passwordHash: await bcrypt.hash(demoAdminPassword, 12),
        },
      },
    },
  });

  console.log('✔ Seed complete');
  console.log(`  Super admin: ${superAdmin.email} (password: ${password})`);
  console.log(`  Default plan: ${plan.name} — PKR ${plan.pricePkr}/mo`);
  console.log(`  Demo school: ${demoSchool.name} — admin@demo.sms.local (password: ${demoAdminPassword})`);
}

main()
  .catch((e) => {
    console.error('x Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

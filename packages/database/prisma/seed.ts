import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@sms.local';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
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

  console.log('✔ Seed complete');
  console.log(`  Super admin: ${superAdmin.email} (password: ${password})`);
  console.log(`  Default plan: ${plan.name} — PKR ${plan.pricePkr}/mo`);
}

main()
  .catch((e) => {
    console.error('x Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

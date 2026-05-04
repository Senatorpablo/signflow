import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@signflow.io' },
    update: {},
    create: {
      email: 'demo@signflow.io',
      name: 'Demo User',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456789012', // bcrypt hash
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log('✅ Demo user created:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

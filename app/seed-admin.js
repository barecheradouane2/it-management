Set-Content -Path "seed-admin.js" -Value @'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@sarpi-dz.com';
  const name = process.env.ADMIN_FULLNAME || 'SARPI Administrator';
  const rawPassword = process.env.ADMIN_PASSWORD || 'ReplaceWithAUniqueLongPassword';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('Admin user initialized successfully:', user.email);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
'@
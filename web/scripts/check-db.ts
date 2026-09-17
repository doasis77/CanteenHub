import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [items, users] = await Promise.all([
    prisma.menuItem.count(),
    prisma.user.count(),
  ]);
  console.log(JSON.stringify({ menuItems: items, users, ok: true }));
}

main()
  .catch((e) => {
    console.error(JSON.stringify({ ok: false, error: String(e) }));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

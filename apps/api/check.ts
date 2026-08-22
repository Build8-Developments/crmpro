import { PrismaClient } from '@crmpro/database';
const prisma = new PrismaClient();
async function check() {
  const roles = await prisma.role.findMany({ where: { name: 'Owner' }, include: { tenant: true } });
  console.log(roles.map(r => r.tenant.slug));
  process.exit(0);
}
check();

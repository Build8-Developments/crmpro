import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { OWNER_PERMISSION_KEYS } from '@crmpro/shared/bootstrap';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! })
});

async function run() {
  const ownerRoles = await prisma.role.findMany({ where: { name: 'Owner' } });
  
  for (const key of Object.values(OWNER_PERMISSION_KEYS)) {
    const permission = await prisma.permission.upsert({
      where: { key: String(key) },
      update: {},
      create: {
        key: String(key),
        description: String(key),
      }
    });

    for (const ownerRole of ownerRoles) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: permission.id }
      });
    }
  }
  console.log('Fixed owner permissions for ' + ownerRoles.length + ' tenants and ' + OWNER_PERMISSION_KEYS.length + ' permissions.');
  process.exit(0);
}
run().catch(console.error);

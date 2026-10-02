const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.$queryRawUnsafe('SELECT current_database(), current_schema(), inet_server_port();');
  console.log('Database verification:', res);
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { success, error } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { getDatabaseConfigError } from '@/lib/db-config';

export async function GET() {
  const configError = getDatabaseConfigError();
  if (configError) {
    return error(configError, 503);
  }

  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'error';
  }

  return success({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    hint:
      dbStatus === 'error'
        ? 'DATABASE_URL is set but Neon is unreachable. Check the connection string and that the project is active in Neon.'
        : undefined,
  });
}

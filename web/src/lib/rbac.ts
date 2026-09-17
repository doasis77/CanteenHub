import { NextRequest } from 'next/server';
import { getAuthUser } from './auth';
import { error } from './api-response';
import { UserRole } from './db-types';

type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

export async function requireAuth(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return { error: error('Unauthorized', 401) };
  if (user.isActive === false) return { error: error('Account deactivated', 403) };
  return { user: user as AuthUser & { isActive?: boolean } };
}

export async function requireRoles(req: NextRequest, roles: UserRole[]) {
  const result = await requireAuth(req);
  if ('error' in result && result.error) return result;
  const { user } = result as { user: AuthUser };
  if (!roles.includes(user.role as UserRole)) {
    return { error: error('Forbidden', 403) };
  }
  return { user };
}

export const Permissions = {
  student: ['STUDENT'] as UserRole[],
  staff: ['STAFF', 'ADMIN'] as UserRole[],
  admin: ['ADMIN'] as UserRole[],
};

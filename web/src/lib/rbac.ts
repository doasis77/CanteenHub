import { NextRequest } from 'next/server';
import { getAuthUser } from './auth';
import { error } from './api-response';
import { UserRole } from './db-types';

type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

export type AuthResult = {
  error?: ReturnType<typeof error>;
  user?: AuthUser;
};

export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const user = await getAuthUser(req);
  if (!user) return { error: error('Unauthorized', 401) };
  if (user.isActive === false) return { error: error('Account deactivated', 403) };
  return { user };
}

export async function requireRoles(req: NextRequest, roles: UserRole[]): Promise<AuthResult> {
  const result = await requireAuth(req);
  if (result.error) return result;
  if (!result.user || !roles.includes(result.user.role as UserRole)) {
    return { error: error('Forbidden', 403) };
  }
  return result;
}

export const Permissions = {
  student: ['STUDENT'] as UserRole[],
  staff: ['STAFF', 'ADMIN'] as UserRole[],
  admin: ['ADMIN'] as UserRole[],
};

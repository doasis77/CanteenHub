import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { UserRole, asUserRole } from './db-types';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_DAYS = 7;

export interface TokenPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function createRefreshToken(userId: string) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

  await prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });

  return token;
}

export async function rotateRefreshToken(oldToken: string) {
  const record = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!record || record.expiresAt < new Date()) return null;

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) return null;

  await prisma.refreshToken.delete({ where: { id: record.id } });
  const newRefresh = await createRefreshToken(user.id);
  const accessToken = signAccessToken({
    userId: user.id,
    role: asUserRole(user.role),
    email: user.email,
  });

  return { accessToken, refreshToken: newRefresh, user };
}

export function getBearerToken(req: NextRequest) {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

export async function getAuthUser(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      studentId: true,
      phone: true,
      role: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      emailVerified: true,
      isActive: true,
      photoUrl: true,
    },
  });

  if (!user || user.isActive === false) return null;
  return user;
}

export function requireRole(userRole: string, allowed: UserRole[]) {
  return allowed.includes(userRole as UserRole);
}

export function generateEmailVerifyToken() {
  return crypto.randomBytes(32).toString('hex');
}

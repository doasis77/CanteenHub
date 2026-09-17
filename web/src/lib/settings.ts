import { prisma } from './prisma';

export async function getSystemSettings() {
  let settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    settings = await prisma.systemSettings.create({ data: {} });
  }
  return settings;
}

export function isUniversityEmail(email: string, domain: string) {
  const normalized = domain.startsWith('@') ? domain : `@${domain}`;
  return email.toLowerCase().endsWith(normalized.toLowerCase());
}

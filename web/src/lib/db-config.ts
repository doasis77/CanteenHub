export function getDatabaseConfigError(): string | null {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return 'DATABASE_URL is not set. Copy web/.env.example to web/.env and add your Neon connection string.';
  }

  if (url.includes('ep-xxxx') || url.includes('user:password@')) {
    return 'DATABASE_URL is still the placeholder from .env.example. Paste your real Neon connection string from https://console.neon.tech';
  }

  return null;
}

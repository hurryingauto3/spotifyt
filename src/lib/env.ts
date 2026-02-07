/**
 * Environment variable validation
 * Ensures all required environment variables are present at runtime
 */

const requiredEnvVars = [
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'SPOTIFY_REDIRECT_URI',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'SESSION_SECRET',
  'NEXT_PUBLIC_APP_URL',
] as const;

const optionalEnvVars = [
  'GEMINI_API_KEY', // Optional but highly recommended
] as const;

export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check optional variables
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please check your .env.local file or deployment environment variables.`
    );
  }

  if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn(
      `⚠️  Missing optional environment variables:\n${warnings.map(v => `  - ${v}`).join('\n')}\n` +
      `Some features may not work correctly.`
    );
  }

  // Validate URL formats
  try {
    new URL(process.env.NEXT_PUBLIC_APP_URL!);
  } catch {
    throw new Error(`Invalid NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
  }

  try {
    new URL(process.env.SPOTIFY_REDIRECT_URI!);
    new URL(process.env.GOOGLE_REDIRECT_URI!);
  } catch {
    throw new Error('Invalid redirect URI format. Must be valid URLs.');
  }

  // Validate session secret length
  if (process.env.SESSION_SECRET!.length < 32) {
    console.warn('⚠️  SESSION_SECRET should be at least 32 characters for security');
  }
}

// Run validation on module load (server-side only)
if (typeof window === 'undefined') {
  validateEnv();
}

// Export typed env vars
export const env = {
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI!,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  },
  session: {
    secret: process.env.SESSION_SECRET!,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

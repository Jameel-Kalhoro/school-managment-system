export interface AppConfig {
  port: number;
  globalPrefix: string;
  corsOrigin: string[];
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: number;
    refreshTtl: number;
  };
  billing: {
    easypaisaAccount: string;
    easypaisaTitle: string;
    whatsappReceipt: string;
    dueDaysBefore: number;
  };
}

export function configuration(): AppConfig {
  return {
    port: Number(process.env.API_PORT ?? 4000),
    globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
    corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim()),
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET as string,
      refreshSecret: process.env.JWT_REFRESH_SECRET as string,
      accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
      refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 1209600),
    },
    // Manual billing display constants (no external API is called).
    billing: {
      easypaisaAccount: process.env.BILLING_EASYPAISA_ACCOUNT ?? '03476379869',
      easypaisaTitle: process.env.BILLING_EASYPAISA_TITLE ?? 'Jameel Ahmed',
      whatsappReceipt: process.env.BILLING_WHATSAPP_RECEIPT ?? '03108495112',
      dueDaysBefore: Number(process.env.BILLING_DUE_DAYS_BEFORE ?? 5),
    },
  };
}

/** Fail fast on boot if critical env vars are missing. */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((k) => !config[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return config;
}

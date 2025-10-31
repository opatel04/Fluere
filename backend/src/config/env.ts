import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  // Server
  nodeEnv: string;
  port: number;
  apiVersion: string;

  // Database
  database: {
    url: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };

  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
  };

  // Gmail API
  gmail: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };

  // Trello API
  trello: {
    apiKey: string;
    apiSecret: string;
    callbackUrl: string;
  };

  // OpenAI API
  openai: {
    apiKey: string;
    primaryModel: string;
    validationModel: string;
    maxTokens: number;
  };

  // Gemini API
  gemini: {
    apiKey: string;
    model: string;
  };

  // Security
  security: {
    jwtSecret: string;
    sessionSecret: string;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };

  // Logging
  logLevel: string;

  // CORS
  allowedOrigins: string[];

  // Email
  email: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
    enabled: boolean;
  };

  // Resend (for inbound email)
  resend: {
    apiKey: string;
    inboundDomain: string;
  };

  // App URL
  appUrl: string;
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  database: {
    url: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'tasksnap',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID || '',
    clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    redirectUri: process.env.GMAIL_REDIRECT_URI || '',
  },

  trello: {
    apiKey: process.env.TRELLO_API_KEY || '',
    apiSecret: process.env.TRELLO_API_SECRET || '',
    callbackUrl: process.env.TRELLO_CALLBACK_URL || '',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    primaryModel: process.env.OPENAI_PRIMARY_MODEL || 'gpt-4o',
    validationModel: process.env.OPENAI_VALIDATION_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000', 10),
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  logLevel: process.env.LOG_LEVEL || 'info',

  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173'],

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'TaskSnap <noreply@tasksnap.com>',
    enabled: process.env.EMAIL_ENABLED === 'true',
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    inboundDomain: process.env.RESEND_INBOUND_DOMAIN || 'tasksnap.com',
  },

  appUrl: process.env.APP_URL || 'http://localhost:3000',
};

// Validate required environment variables
const validateConfig = (): void => {
  const requiredVars = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'TRELLO_API_KEY',
    'TRELLO_API_SECRET',
    'OPENAI_API_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0 && config.nodeEnv === 'production') {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
};

// Validate on import (skip during build phase)
// During Railway build, DATABASE_URL won't be available yet
const isBuilding = !process.env.DATABASE_URL && process.env.RAILWAY_ENVIRONMENT;
if (config.nodeEnv !== 'test' && !isBuilding) {
  validateConfig();
}

export default config;

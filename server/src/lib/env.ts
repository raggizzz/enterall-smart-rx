import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const hasValue = (value: string | undefined): value is string => typeof value === 'string' && value.trim().length > 0;

const loadEnvironment = () => {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'server', '.env'),
    path.resolve(__dirname, '../../.env'),
  ];

  for (const envPath of candidatePaths) {
    if (!fs.existsSync(envPath)) continue;

    const parsed = dotenv.parse(fs.readFileSync(envPath));
    for (const [key, value] of Object.entries(parsed)) {
      if (!hasValue(process.env[key])) {
        process.env[key] = value;
      }
    }
  }
};

loadEnvironment();

export const getRequiredEnv = (name: string, message?: string): string => {
  const value = process.env[name];
  if (!hasValue(value)) {
    throw new Error(message || `[config] ${name} environment variable is required.`);
  }
  return value;
};

import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

function parseNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const appConfig = {
  apiPort: parseNumber(process.env.API_PORT, 8787),
  dataDir: path.resolve(process.cwd(), process.env.DATA_DIR ?? 'data/processed'),
  fallbackDataDir: path.resolve(process.cwd(), 'data/demo'),
  vectorDim: parseNumber(process.env.VECTOR_DIM, 256),
  hybridAlpha: parseNumber(process.env.HYBRID_ALPHA, 0.6),
  hybridBeta: parseNumber(process.env.HYBRID_BETA, 0.4),
  qdrantUrl: process.env.QDRANT_URL,
  qdrantApiKey: process.env.QDRANT_API_KEY,
  qdrantCollection: process.env.QDRANT_COLLECTION ?? 'books_hybrid_demo',
} as const;

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory sliding window Rate Limiter
// Max 20 requests per minute per IP address
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

interface RateRecord {
  timestamps: number[];
}

const rateLimitStore: Map<string, RateRecord> = new Map();

function isRateLimited(ip: string): { limited: boolean; remaining: number } {
  const now = Date.now();
  let record = rateLimitStore.get(ip);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(ip, record);
  }

  // Filter timestamps within current 60s window
  record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return { limited: true, remaining: 0 };
  }

  record.timestamps.push(now);
  const remaining = MAX_REQUESTS_PER_WINDOW - record.timestamps.length;
  return { limited: false, remaining };
}

/**
 * Нормализация кода для сравнения контрольных сумм
 */
function normalizeCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '') // Remove comments
    .replace(/--.*$/gm, '') // Remove SQL comments
    .replace(/\s+/g, ' ') // Collapse multiple whitespace
    .trim()
    .toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    // 1. IP Detection for Rate Limiting
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    const { limited, remaining } = isRateLimited(ip);
    if (limited) {
      return NextResponse.json(
        {
          success: false,
          error: '⏱ Превышен лимит запросов: максимум 20 проверок в минуту. Пожалуйста, подождите немного перед следующей попыткой.',
        },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // 2. Parse Body
    const body = await req.json();
    const { lessonId, moduleSlug, userCode, expectedHash } = body;

    if (!userCode || typeof userCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Код решения не передан' },
        { status: 400 }
      );
    }

    // 3. Cryptographic hash calculation (SHA-256)
    const normalized = normalizeCode(userCode);
    const userHash = crypto.createHash('sha256').update(normalized).digest('hex');

    // 4. Hash verification if expectedHash was specified
    let isHashMatch = true;
    if (expectedHash && typeof expectedHash === 'string') {
      isHashMatch = userHash === expectedHash.toLowerCase();
    }

    return NextResponse.json({
      success: true,
      lessonId,
      moduleSlug,
      calculatedHash: userHash,
      isHashMatch,
      rateLimitRemaining: remaining,
      verifiedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера при проверке решения' },
      { status: 500 }
    );
  }
}

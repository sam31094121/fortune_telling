// lib/core/auth.ts

/**
 * 簡易 JWT 認證模組（示範用）
 * 需要安裝 jsonwebtoken
 */
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface JwtPayload {
  sub: string; // user id
  iat: number;
  exp: number;
}

/** 產生 JWT */
export function signToken(userId: string, expiresIn = '2h'): string {
  return jwt.sign({ sub: userId } as any, SECRET, { expiresIn });
}

/** 驗證 JWT */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch (e) {
    return null;
  }
}

/** Next.js Middleware 版驗證 */
export async function authMiddleware(request: Request): Promise<Request> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing Authorization');
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) throw new Error('Invalid token');
  // @ts-ignore attach userId for downstream handlers
  (request as any).userId = payload.sub;
  return request;
}

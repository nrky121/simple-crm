/**
 * Cursor-based pagination utilities.
 * Cursors are base64url-encoded JSON: { id: string, createdAt: string }
 */

export interface CursorPayload {
  id: string;
  createdAt: string;
}

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString("base64url");
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    return JSON.parse(json) as CursorPayload;
  } catch {
    return null;
  }
}

/**
 * Build a Prisma `where` clause for cursor pagination.
 * Returns records created before the cursor (descending order).
 */
export function buildCursorWhere(cursor: string | null | undefined) {
  if (!cursor) return undefined;

  const decoded = decodeCursor(cursor);
  if (!decoded) return undefined;

  return {
    OR: [
      { createdAt: { lt: new Date(decoded.createdAt) } },
      {
        createdAt: { equals: new Date(decoded.createdAt) },
        id: { lt: decoded.id },
      },
    ],
  };
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function parsePageSize(size: string | null | undefined): number {
  if (!size) return DEFAULT_PAGE_SIZE;
  const n = parseInt(size, 10);
  if (isNaN(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
}

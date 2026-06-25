import { API_BASE_URL } from '../config';
import type { ApiErrorBody } from '../types/api';

/**
 * Error thrown for any non-2xx response. Carries the HTTP status and the parsed
 * uniform error body when present, so callers can branch on `status` (e.g. the
 * 409 seat-conflict path) and read `body.message` for display.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, message: string, body: ApiErrorBody | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface RequestOptions extends RequestInit {
  /** Plain object — serialized to JSON with the right Content-Type. */
  json?: unknown;
}

/** Build a `?a=1&b=2` query string from a params object, skipping undefined/null/''. */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    usp.append(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

/** Issue the raw fetch. Kept separate so the auth layer (Slice 2) can retry it. */
export function rawFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const { json, headers, ...rest } = options;
  return fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
}

/** Parse a Response into T, throwing ApiError on non-2xx. 204 → undefined. */
export async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const body =
      data && typeof data === 'object' && 'status' in data ? (data as ApiErrorBody) : null;
    throw new ApiError(res.status, body?.message ?? res.statusText, body);
  }
  return data as T;
}

/**
 * The typed API entry point used by every endpoint module. No auth yet — the
 * Bearer header and the single-flight refresh-on-401 retry are added in Slice 2
 * by wrapping `rawFetch` here.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await rawFetch(path, options);
  return parseResponse<T>(res);
}

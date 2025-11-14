import type { NextFetchRequestConfig } from "next/dist/server/web/spec-extension/request";

export const API_PREFIX = "/api/v1";
const DEFAULT_SERVER_BASE = process.env.BATTLE_RAP_API_BASE_URL ?? "http://localhost:3000";
const DEFAULT_INTERNAL_BASE = process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL ?? "/api/battle-rap";

const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

const serverBase = `${trimTrailingSlash(DEFAULT_SERVER_BASE)}${API_PREFIX}`;
const clientBase = trimTrailingSlash(DEFAULT_INTERNAL_BASE);

type QueryPrimitive = string | number | boolean | null | undefined;
type QueryValue = QueryPrimitive | Array<string | number | boolean>;

export type QueryParams = Record<string, QueryValue>;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const serializeValue = (value: Exclude<QueryValue, undefined>) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
};

export const buildQueryString = (params?: QueryParams) => {
  if (!params) {
    return "";
  }
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    const serialized = serializeValue(value);
    if (serialized === null) {
      return;
    }
    if (Array.isArray(serialized)) {
      serialized.forEach((entry) => usp.append(key, entry));
      return;
    }
    usp.append(key, serialized);
  });
  const result = usp.toString();
  return result ? `?${result}` : "";
};

const resolveRuntimeBase = () => {
  if (typeof window === "undefined") {
    return serverBase;
  }
  return clientBase;
};

export type ApiFetchOptions = RequestInit & { next?: NextFetchRequestConfig };

export async function apiFetch<TResponse>(path: string, init?: ApiFetchOptions): Promise<TResponse> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const input = `${resolveRuntimeBase()}${normalizedPath}`;
  const response = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.text();

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = payload ? JSON.parse(payload) : null;
    } catch {
      body = payload;
    }
    throw new ApiError(response.status, `API request failed with status ${response.status}`, body);
  }

  if (!payload) {
    return null as TResponse;
  }

  try {
    return JSON.parse(payload) as TResponse;
  } catch {
    return payload as TResponse;
  }
}

export const withQuery = (path: string, params?: QueryParams) => `${path}${buildQueryString(params)}`;

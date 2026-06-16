/**
 * Minimal Studioshare Launch identity for KGO-ES (feedback API auth).
 * Mirrors trackIT launch identity sources: cookie JWT, meta tags, /launch-identity.json.
 */

export type StudioshareLaunchIdentity = {
  subject?: string;
  email?: string;
  username?: string;
  displayName?: string;
  hubId?: string;
};

let resolvedCache: StudioshareLaunchIdentity | null | undefined;

export function resetStudioshareLaunchIdentityCache(): void {
  resolvedCache = undefined;
}

function trim(value: string | undefined | null): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function stringClaim(payload: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/** Launch MyID cookie (readable when not HttpOnly). */
export function getStudioshareAccessToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function fromAccessToken(token: string): StudioshareLaunchIdentity | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const email = stringClaim(payload, "email", "preferred_username", "upn");
  const username =
    stringClaim(payload, "username", "preferred_username", "unique_name", "sub") ?? email;
  const displayName =
    stringClaim(payload, "name", "display_name", "displayName") ?? username ?? email;
  const subject = stringClaim(payload, "sub");
  const hubId = stringClaim(payload, "hub_id", "hubId", "hub", "employee_id", "employeeId");

  if (!email && !username && !displayName && !subject && !hubId) return null;

  return {
    subject,
    email,
    username,
    displayName: displayName ?? username ?? email,
    hubId,
  };
}

function metaContent(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return trim(document.querySelector(`meta[name="${name}"]`)?.getAttribute("content"));
}

function fromMeta(): StudioshareLaunchIdentity | null {
  const email =
    metaContent("studioshare-user-email") ??
    metaContent("x-studioshare-user-email") ??
    metaContent("x-forwarded-user");
  const displayName =
    metaContent("studioshare-user-display-name") ?? metaContent("studioshare-user-name");
  const username = metaContent("studioshare-user-username") ?? email;
  const hubId = metaContent("studioshare-hub-id");
  if (!email && !displayName && !username && !hubId) return null;
  return {
    email,
    username,
    displayName: displayName ?? username ?? email,
    hubId,
  };
}

function parseIdentityPayload(data: unknown): StudioshareLaunchIdentity | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const nested =
    row.user && typeof row.user === "object" ? (row.user as Record<string, unknown>) : row;
  const email = trim((nested.email ?? row.email) as string | undefined);
  const username =
    trim(
      (nested.username ?? nested.preferred_username ?? nested.user_name ?? row.username) as
        | string
        | undefined,
    ) ?? email;
  const displayName =
    trim(
      (nested.display_name ??
        nested.displayName ??
        nested.name ??
        nested.full_name ??
        row.display_name ??
        row.displayName ??
        row.name) as string | undefined,
    ) ??
    username ??
    email;
  const subject = trim((nested.sub ?? nested.id ?? nested.user_id ?? row.sub ?? row.id) as string | undefined);
  const hubId = trim((nested.hub_id ?? nested.hubId ?? row.hub_id ?? row.hubId) as string | undefined);
  if (!email && !username && !displayName && !subject && !hubId) return null;
  return { subject, email, username, displayName, hubId };
}

async function fetchLaunchRuntimeIdentity(): Promise<StudioshareLaunchIdentity | null> {
  try {
    const res = await fetch("/launch-identity.json", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) return null;
    return parseIdentityPayload(await res.json());
  } catch {
    return null;
  }
}

function readSyncSources(): StudioshareLaunchIdentity | null {
  const token = getStudioshareAccessToken();
  if (token) {
    const fromToken = fromAccessToken(token);
    if (fromToken) return fromToken;
  }
  return fromMeta();
}

/** Cached Launch identity for feedback appState and API auth headers. */
export async function resolveStudioshareLaunchIdentity(force = false): Promise<StudioshareLaunchIdentity | null> {
  if (!force && resolvedCache !== undefined) return resolvedCache;

  const sync = readSyncSources();
  if (sync) {
    resolvedCache = sync;
    return sync;
  }

  const fromRuntime = await fetchLaunchRuntimeIdentity();
  resolvedCache = fromRuntime;
  return fromRuntime;
}

export function readStudioshareLaunchIdentity(): StudioshareLaunchIdentity | null {
  if (resolvedCache !== undefined) return resolvedCache;
  return readSyncSources();
}

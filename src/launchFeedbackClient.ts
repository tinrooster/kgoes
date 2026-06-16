/**
 * Standalone KGO-ES → trackIT Launch plant API feedback submit.
 */
import type { FeedbackReportType } from "./feedbackReportBridge";
import { isLaunchPlantApiEnabled, plantApiUrl } from "./plantApiOrigin";
import { getStudioshareAccessToken, resolveStudioshareLaunchIdentity } from "./studioshareLaunchIdentity";
import { useSchematicStore } from "./store";

const ORG_CACHE_KEY = "kgo-es:feedback-org-id";

type LaunchOrgRow = {
  organizationId: string;
  name: string;
  role?: string;
};

async function resolveAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getStudioshareAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function launchFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await resolveAuthHeaders();
  const res = await fetch(plantApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Launch feedback API failed (${res.status})`);
  }
  return body;
}

async function listLaunchOrganizations(): Promise<LaunchOrgRow[]> {
  const data = await launchFetch<{ organizations?: LaunchOrgRow[] }>("/api/launch/organizations");
  return data.organizations ?? [];
}

export async function resolveFeedbackOrganizationId(): Promise<string | null> {
  const link = useSchematicStore.getState().trackItLink;
  const fromLink = link?.organizationId?.trim();
  if (fromLink) return fromLink;

  const fromEnv = (import.meta.env.VITE_LAUNCH_SYNC_ORG_ID as string | undefined)?.trim();
  if (fromEnv) return fromEnv;

  try {
    const cached = localStorage.getItem(ORG_CACHE_KEY)?.trim();
    if (cached) return cached;
  } catch {
    // ignore storage errors
  }

  try {
    const orgs = await listLaunchOrganizations();
    if (!orgs.length) return null;
    const admin = orgs.find((o) => o.role === "admin");
    const pick = admin ?? orgs[0];
    try {
      localStorage.setItem(ORG_CACHE_KEY, pick.organizationId);
    } catch {
      // ignore
    }
    return pick.organizationId;
  } catch {
    return null;
  }
}

export async function submitLaunchFeedbackReport(input: {
  reportType: FeedbackReportType;
  notes?: string;
  pageUrl: string;
  screenshotDataUrl: string | null;
  appState: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isLaunchPlantApiEnabled()) {
    return { ok: false, error: "Launch feedback API is not available" };
  }

  const organizationId = await resolveFeedbackOrganizationId();
  if (!organizationId) {
    return {
      ok: false,
      error: "No organization context — open a linked drawing from trackIT or sign in on Launch.",
    };
  }

  const identity = await resolveStudioshareLaunchIdentity();
  const appState = {
    ...input.appState,
    organizationId,
    relayedFrom: "kgo-es-standalone",
    user: identity
      ? {
          id: identity.hubId
            ? `studioshare:hub:${identity.hubId.toLowerCase()}`
            : identity.subject ?? null,
          username: identity.email ?? identity.username ?? null,
          displayName: identity.displayName ?? null,
        }
      : null,
  };

  try {
    await launchFetch("/api/launch/feedback/reports", {
      method: "POST",
      body: JSON.stringify({
        organizationId,
        workspaceId: null,
        reportType: input.reportType,
        pageUrl: input.pageUrl,
        userAgent: navigator.userAgent,
        notes: input.notes?.trim() || null,
        appState,
        screenshotDataUrl: input.screenshotDataUrl,
      }),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Launch submit failed" };
  }
}

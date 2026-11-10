/** Hostname from a bare domain or full URL (lowercase). */
export function hostnameFromOriginEntry(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Embedding client origin from document.referrer (empty on direct /login). */
export function getLoginImpersonationClientOrigin(): string {
  const referrer = typeof document !== "undefined" ? document.referrer : "";
  if (!referrer) {
    return "";
  }
  try {
    return new URL(referrer).origin;
  } catch {
    return "";
  }
}

/** Whether Quick login may be shown for this application in the current browser context. */
export function isLoginImpersonationClientAllowed(application: any): boolean {
  if (!application?.enableLoginImpersonation) {
    return false;
  }
  const origins = application.loginImpersonationOrigins;
  if (!Array.isArray(origins) || origins.length === 0) {
    return false;
  }
  const clientOrigin = getLoginImpersonationClientOrigin();
  const clientHost = hostnameFromOriginEntry(clientOrigin);
  if (!clientHost) {
    return false;
  }
  return origins.some((entry: string) => hostnameFromOriginEntry(entry) === clientHost);
}

// Google OAuth: consent URL, code exchange, and an access-token provider that refreshes on demand.

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export class ReauthRequiredError extends Error {
  constructor(detail: string) {
    super(`Google access was revoked or expired; the user must reconnect (${detail})`);
    this.name = "ReauthRequiredError";
  }
}

export class GoogleApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    url: string,
  ) {
    super(`Google API ${status} for ${url}: ${body.slice(0, 300)}`);
    this.name = "GoogleApiError";
  }
}

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function authUrl(client: OAuthClient, state: string, loginHint?: string): string {
  const p = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  if (loginHint) p.set("login_hint", loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export async function exchangeCode(client: OAuthClient, code: string, fetcher: typeof fetch = fetch): Promise<TokenResponse> {
  const res = await fetcher(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: client.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new GoogleApiError(res.status, await res.text(), TOKEN_URL);
  return res.json();
}

/**
 * Reads claims from an ID token received directly from Google's token endpoint over TLS
 * (OIDC Core §3.1.3.7 allows relying on TLS for tokens obtained this way).
 */
export function idTokenClaims(idToken: string): { email?: string; email_verified?: boolean; name?: string; sub?: string } {
  const payload = idToken.split(".")[1] ?? "";
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (payload.length % 4)) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(json, (c) => c.charCodeAt(0))));
}

/** Supplies access tokens for one user, refreshing with the stored refresh token. */
export class TokenProvider {
  private access: { token: string; expiresAt: number } | null = null;

  constructor(
    private client: OAuthClient,
    private refreshToken: () => Promise<string | null>,
    private fetcher: typeof fetch = fetch,
    private clock: () => number = Date.now,
  ) {}

  invalidate() {
    this.access = null;
  }

  async token(): Promise<string> {
    if (this.access && this.access.expiresAt - 60_000 > this.clock()) return this.access.token;
    const refresh = await this.refreshToken();
    if (!refresh) throw new ReauthRequiredError("no refresh token");
    const res = await this.fetcher(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.client.clientId,
        client_secret: this.client.clientSecret,
        refresh_token: refresh,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 400 && body.includes("invalid_grant")) throw new ReauthRequiredError("invalid_grant");
      throw new GoogleApiError(res.status, body, TOKEN_URL);
    }
    const data = (await res.json()) as TokenResponse;
    this.access = { token: data.access_token, expiresAt: this.clock() + data.expires_in * 1000 };
    return data.access_token;
  }

  /** fetch with a bearer token; retries once with a fresh token on 401. */
  async fetch(url: string, init: RequestInit = {}): Promise<Response> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const headers = new Headers(init.headers);
      headers.set("authorization", `Bearer ${await this.token()}`);
      if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
      const res = await this.fetcher(url, { ...init, headers });
      if (res.status === 401 && attempt === 0) {
        this.invalidate();
        continue;
      }
      return res;
    }
    throw new Error("unreachable");
  }
}

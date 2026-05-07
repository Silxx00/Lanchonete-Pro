const ACCESS_TOKEN_KEY = "nova-era-access-token";
const REFRESH_TOKEN_KEY = "nova-era-refresh-token";

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp as number | undefined;
    if (!exp) return false;
    return Date.now() / 1000 >= exp - 30;
  } catch {
    return true;
  }
}

export interface TokenUser {
  id: number;
  email: string;
  role: string;
}

export function parseTokenUser(token: string): TokenUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1])) as { sub: number; email: string; role: string };
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

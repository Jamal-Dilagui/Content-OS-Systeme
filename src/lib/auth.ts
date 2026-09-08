// Simple client-side auth for single admin user
// Credentials are set in code (constant-time-ish compare). Session stored in localStorage.

const ADMIN_USERNAME = "jamal dilagui";
const ADMIN_PASSWORD = "jamaldilagui@10!!!";
const SESSION_KEY = "content-os-session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export type Session = {
  username: string;
  loginAt: number;
  expiresAt: number;
};

// Simple string compare (not crypto-constant-time, but fine for client-side single admin)
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function login(username: string, password: string): boolean {
  if (safeCompare(username.toLowerCase().trim(), ADMIN_USERNAME) && safeCompare(password, ADMIN_PASSWORD)) {
    const now = Date.now();
    const session: Session = {
      username: ADMIN_USERNAME,
      loginAt: now,
      expiresAt: now + SESSION_DURATION,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {}
    return true;
  }
  return false;
}

export function logout(): void {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

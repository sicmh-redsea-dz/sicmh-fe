export interface SessionClaims {
  uid: string; codigoEmpresa: string; sv: number; iat: number; exp: number; sessionStartedAt?: number
}
export const IDLE_MS = 30 * 60_000
export const MAX_SESSION_MS = 8 * 60 * 60_000
export function readSession(token: string | null): SessionClaims | null {
  try {
    const value = JSON.parse(atob((token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof value.uid === 'string' && typeof value.codigoEmpresa === 'string'
      && Number.isFinite(value.iat) && Number.isFinite(value.exp) ? value : null
  } catch { return null }
}
export function sessionDecision(claims: SessionClaims, lastActivity: number, now: number) {
  const maximum = ((claims.sessionStartedAt ?? claims.iat) * 1000) + MAX_SESSION_MS
  const deadline = Math.min(claims.exp * 1000, lastActivity + IDLE_MS, maximum)
  return { expired: now >= deadline, remaining: deadline - now,
    maximumReachedSoon: maximum - now <= 5 * 60_000,
    renew: now < deadline && claims.exp * 1000 - now <= 10 * 60_000
      && lastActivity > claims.iat * 1000 && maximum - now > 60_000 }
}

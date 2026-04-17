# Security Architecture — OnePoint Employee Portal

## Overview
This document describes every security measure implemented in the portal, why it exists, and where it lives in the codebase.

---

## 1. Authentication (`src/lib/auth.ts`, `src/lib/security/account-lockout.ts`)

| Measure | Implementation | Why |
|---|---|---|
| Password hashing | bcrypt, cost factor 12 | Industry standard, resistant to GPU attacks |
| Session tokens | JWT in HTTP-only, Secure, SameSite=Lax cookies | Prevents XSS token theft, CSRF mitigation |
| Session expiry | 8 hours (matches work shift) | Limits exposure if token is compromised |
| Account lockout | 5 failed attempts in 10 min → locked | Prevents brute force, requires admin unlock |
| 2FA | TOTP via authenticator app (otplib) | Cryptographic, no SIM-swap risk (SMS rejected) |

## 2. Encryption (`src/lib/security/encryption.ts`)

| What | Method | Key |
|---|---|---|
| OAuth tokens at rest | AES-256-GCM | `ENCRYPTION_KEY_TOKENS` env var |
| PII fields at rest | AES-256-GCM | `ENCRYPTION_KEY_PII` env var (separate key) |
| 2FA secrets | AES-256-GCM via PII key | Same PII encryption |

WHY two separate keys: If one key is compromised, the other data category remains protected.

WHY AES-256-GCM: Authenticated encryption — provides both confidentiality AND integrity.

## 3. Input Validation (`src/lib/security/validation.ts`)

All API inputs validated server-side with Zod schemas before reaching the database. Schemas defined for:
- Login, signup, password reset, profile update
- Cart operations, access requests, time tracking
- CSV import (5MB max), form submissions
- TOTP verification (exactly 6 numeric digits)

## 4. Rate Limiting (`src/lib/security/rate-limiter.ts`)

| Endpoint | Limit | Window |
|---|---|---|
| Login | 5 requests | 10 minutes |
| Password reset | 3 requests | 15 minutes |
| OAuth callbacks | 10 requests | 15 minutes |
| Signup | 3 requests | 1 hour |
| General API | 60 requests | 1 minute |

## 5. CSRF Protection (`src/lib/security/csrf.ts`)

Double-submit cookie pattern:
1. Server sets a CSRF token in a non-httpOnly cookie
2. Client reads the cookie and sends it in the `X-CSRF-Token` header
3. Server compares both using timing-safe comparison

Applied to all POST, PUT, DELETE requests.

## 6. Security Headers (`src/middleware.ts`)

| Header | Value | Why |
|---|---|---|
| HSTS | max-age=31536000; includeSubDomains; preload | Force HTTPS for 1 year |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Limit referrer leakage |
| Content-Security-Policy | Strict CSP | Prevent XSS, data injection |
| Permissions-Policy | Disable camera, mic, geo | Minimize browser attack surface |

## 7. RBAC (`src/lib/security/rbac.ts`)

Three roles with escalating permissions:

| Role | Access |
|---|---|
| Employee | Own data only — policies, cart, forms, time tracking |
| Admin | Employee data + access approvals + time tracking admin + audit logs |
| Super-admin | Everything + system config + role assignments + encryption management |

## 8. Audit Logging (`src/lib/security/audit-log.ts`)

Append-only log recording:
- Every authentication event (login, logout, signup, password change)
- Every OAuth authentication (initiated, completed, failed)
- Every admin action (approve, deny, unlock)
- Every data access to sensitive records
- Every role change
- Every failed authentication attempt
- Every rate limit hit and CSRF violation

Each entry includes: timestamp, userId, IP, user agent, action, target, success/failure, severity.

## 9. Token & Secret Handling

- All OAuth client secrets → env vars only
- All access/refresh tokens → encrypted before DB write
- Logging → `redactSensitive()` strips tokens/secrets before any console output
- No secrets in client-side code — all OAuth flows are server-side API routes

## 10. Data Protection

- PII encryption at column level (name, address, phone, ID numbers)
- Separate encryption key from token encryption key
- Data retention: audit logs retained indefinitely, sessions auto-purge after 90 days

## 11. Environment Separation

| Env | Database | Keys | Data |
|---|---|---|---|
| Development | Local/Atlas dev cluster | Dev-only keys | Synthetic data only |
| Staging | Separate Atlas cluster | Staging keys | Anonymized data |
| Production | Production Atlas cluster | Production keys | Real data |

NEVER use production data in dev/staging.

## 12. Dependency Security

Run before every deployment:
```bash
npm audit
```
Fail build on high/critical vulnerabilities. Keep Next.js and all deps updated.

---

## File Reference

| File | Purpose |
|---|---|
| `src/middleware.ts` | Security headers on every response |
| `src/lib/security/encryption.ts` | AES-256-GCM encrypt/decrypt for tokens + PII |
| `src/lib/security/audit-log.ts` | Append-only audit trail |
| `src/lib/security/rate-limiter.ts` | Per-endpoint rate limiting |
| `src/lib/security/csrf.ts` | CSRF token generation + validation |
| `src/lib/security/rbac.ts` | Role-based access control |
| `src/lib/security/account-lockout.ts` | Failed login tracking + lockout |
| `src/lib/security/two-factor.ts` | TOTP 2FA setup + verification |
| `src/lib/security/validation.ts` | Zod schemas for all API inputs |

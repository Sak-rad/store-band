# Security Documentation

Last audit: **2026-05-19**
Audited by: Claude (Sonnet 4.6) + Alex

---

## Auth security decisions

### Refresh token hashing (implemented 2026-05-19)
- **Decision:** store `SHA-256(refreshToken)` in DB, never the plain token
- **Why:** if DB is compromised, attacker gets hashes — useless without the cookie
- **Implementation:** `auth.service.ts` → `hashToken()` uses `crypto.createHash('sha256')`
- **Note:** SHA-256 (not Argon2) is correct here — token is already 64 bytes of CSPRNG output, salting unnecessary

### Token architecture
- Access token: JWT HS256, **15 min TTL**, lives in memory only (Zustand, never localStorage)
- Refresh token: 128-char hex (`crypto.randomBytes(64)`), **30 day TTL**, httpOnly cookie
- Cookie flags: `httpOnly: true`, `secure: true` (prod), `sameSite: 'none'` (prod, needed for cross-origin Railway)
- Rotation: every refresh call deletes old session, creates new one

### Password security
- Algorithm: **Argon2id** (`memoryCost: 19456, timeCost: 2, parallelism: 1`)
- Memory cost tuned down from default 65536 → 19456 for Railway free tier (512MB RAM)
- `MaxLength(128)` on all password inputs — prevents Argon2 DoS via oversized input
- Requirements: min 8 chars, ≥1 uppercase, ≥1 digit

### DoS protection
- Rate limiting: 5 req/min on `/auth/register` and `/auth/login` via `@Throttle`
- Rate limiting: 20 req/min on `/auth/refresh`
- Global throttle: 60 req/min (from `THROTTLE_LIMIT` env var)
- MaxLength validation on all string inputs at DTO level

### Infrastructure security
- `trust proxy = 1` in `main.ts` — correct IP from `X-Forwarded-For` behind Railway/Nginx
- Helmet.js enabled with `crossOriginResourcePolicy: 'cross-origin'` (required for MinIO assets)
- CORS locked to `CLIENT_URL` env var only
- Global `whitelist: true` on ValidationPipe — strips unknown fields

### 401 interceptor deadlock fix (2026-05-19)
- **Problem:** if `/auth/refresh` itself returned 401, the interceptor would re-queue it → deadlock, user never logged out
- **Fix:** `api.ts` interceptor skips retry if `original.url?.includes('/auth/refresh')`

---

## Known risks / accepted trade-offs

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| ThrottleModule without Redis storage | Low | Single instance on Railway free tier | Accepted — note if scaling |
| MinIO console exposed on port 9001 (staging) | Medium | Change password, close port on prod | Must fix before prod |
| No session count limit per user | Low | Sessions expire in 30d naturally | Accepted |
| `sameSite: 'none'` allows cookie on any cross-site request to refresh endpoint | Low | Attacker can trigger refresh but can't read new token (CORS blocks response) | Accepted |
| Email enumeration on `/auth/register` (409 if taken) | Low | Industry-standard UX trade-off, known and intentional | Accepted |

---

## Security checklist before production

- [ ] Rotate all JWT secrets (`openssl rand -hex 64`)
- [ ] Rotate MinIO/S3 credentials
- [ ] Set strong `POSTGRES_PASSWORD`
- [ ] Close MinIO port 9001 or put behind VPN
- [ ] Enable HTTPS (SSL cert) — Nginx + Let's Encrypt or Railway domain
- [ ] Set `NODE_ENV=production` — enables `secure` cookie flag
- [ ] Review CORS `CLIENT_URL` — must be exact production domain
- [ ] Set `THROTTLE_LIMIT` appropriately
- [ ] Enable PostgreSQL connection pooling (PgBouncer) if traffic grows
- [ ] Set up DB backups (Railway automated backups or pg_dump cron)

---

## Files modified in security audit (2026-05-19)

| File | Change |
|------|--------|
| `apps/web/src/shared/lib/api.ts` | Fixed 401 deadlock on refresh endpoint |
| `apps/api/src/main.ts` | Added `trust proxy = 1` |
| `apps/api/src/modules/auth/auth.controller.ts` | Rate limit refresh, `user-agent ?? 'unknown'` |
| `apps/api/src/modules/auth/auth.service.ts` | SHA-256 refresh token hashing, explicit argon2id |
| `apps/api/src/modules/auth/dto/register.dto.ts` | MaxLength on email, password, name |
| `apps/api/src/modules/auth/dto/login.dto.ts` | MaxLength on email, password |
| `apps/api/src/modules/auth/strategies/jwt.strategy.ts` | Removed dead cookie extractor |
| `apps/api/i18n/en/errors.json` | Fixed `{constraints.0}` interpolation for maxLength |
| `apps/api/i18n/ru/errors.json` | Fixed `{constraints.0}` interpolation for maxLength |

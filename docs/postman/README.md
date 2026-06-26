# CRMPro Postman

Local API testing collection for auth flows.

## Files

| File | Purpose |
| --- | --- |
| `crmpro-auth.postman_collection.json` | Requests, scripts, folder structure |
| `crmpro-local.postman_environment.json` | Local dev variables |

## Import

1. Open Postman
2. **Import** → drag both JSON files (or import the `docs/postman` folder)
3. Select environment **CRMPro Local** in the top-right dropdown
4. Start API: `pnpm --filter api start:dev`
5. Run **Auth → Login**

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `baseUrl` | `http://localhost:3000/api/v1` | API base (includes version prefix) |
| `tenantSlug` | `prime-estates` | Seeded tenant |
| `email` | `owner@primeestates.com` | Seeded owner user |
| `password` | `Password123!` | Seeded password |
| `accessToken` | *(empty)* | Auto-filled after login (Chunk 3+) |
| `refreshToken` | *(empty)* | Auto-filled after login (Chunk 3+) |
| `sessionId` | *(empty)* | Auto-filled when returned (Chunk 3+) |

Switch `email` / `password` to test other seeded users (`manager@primeestates.com`, `agent@primeestates.com`).

## Token auto-save

**Login** includes a test script that:

- Asserts a successful status code (200 or 201)
- Parses JSON response
- Saves `accessToken`, `refreshToken`, `sessionId` **only if present**

Chunk 2 returned `{ success, message, user }` — no tokens.

Chunk 3+ login returns `accessToken` and `refreshToken` — both auto-save to the environment.

## Bearer token injection

Collection **pre-request script**:

- If `accessToken` is set → adds `Authorization: Bearer {{accessToken}}`
- If empty → no header (login and other public routes work unchanged)

Future protected routes like **Get Me** will work after login once tokens are returned.

## Clear auth state

**Debug → Clear Auth Tokens** wipes `accessToken`, `refreshToken`, and `sessionId` from the environment.

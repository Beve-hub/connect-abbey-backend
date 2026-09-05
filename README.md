# Connect — Backend

Express + TypeScript + Prisma (PostgreSQL) API implementing:

- **Auth** — signup, login, JWT access/refresh tokens, logout, session validation
- **Accounts** — profile read/update, public profile lookup, user search
- **Relationships** — send / accept / reject / remove connection requests, list connections & pending requests

## Stack

- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT (access + refresh tokens) via `jsonwebtoken`
- `bcryptjs` for password hashing
- `zod` for request validation

## Setup

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL and JWT secrets
npx prisma migrate dev --name init
npm run seed                # optional: creates 3 demo users, password: password123
npm run dev                 # starts on http://localhost:4000
```

Quickest local Postgres option if you don't have one running:

```bash
docker run --name connect-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=connect_db -p 5432:5432 -d postgres:16
```

## Auth model

Stateless JWT, two tokens:

- **Access token** (short-lived, default 15m) — sent as `Authorization: Bearer <token>` on every protected request
- **Refresh token** (long-lived, default 7d) — exchanged at `POST /auth/refresh` for a new access token when the old one expires

Logout is client-side (discard both tokens). See the comment in `auth.controller.ts` for how to add server-side revocation (token blocklist) if needed.

## Endpoints

### Auth
| Method | Path | Auth required | Body |
|---|---|---|---|
| POST | `/auth/signup` | no | `{ email, password, name }` |
| POST | `/auth/login` | no | `{ email, password }` |
| POST | `/auth/refresh` | no | `{ refreshToken }` |
| POST | `/auth/logout` | yes | — |
| GET | `/auth/me` | yes | — |

### Accounts
| Method | Path | Auth required | Body |
|---|---|---|---|
| GET | `/profile` | yes | — |
| PUT | `/profile` | yes | `{ name?, bio?, jobTitle?, avatarUrl? }` |
| GET | `/users/search?q=...` | yes | — |
| GET | `/users/:id` | yes | — |

### Relationships
| Method | Path | Auth required | Body |
|---|---|---|---|
| POST | `/connections` | yes | `{ addresseeId }` |
| PATCH | `/connections/:id` | yes | `{ action: "ACCEPT" \| "REJECT" }` |
| DELETE | `/connections/:id` | yes | — |
| GET | `/connections` | yes | — (accepted connections) |
| GET | `/connections/pending` | yes | — (incoming requests) |
| GET | `/connections/sent` | yes | — (outgoing requests) |

## Data model

```
User 1---1 Profile
User 1---* Connection (as requester)
User 1---* Connection (as addressee)
```

`Connection.status` is one of `PENDING | ACCEPTED | REJECTED`. A unique constraint on `(requesterId, addresseeId)` prevents duplicate requests in the same direction; the controller also checks the reverse direction so two users can't both have pending requests to each other.

## Testing with Postman

Import `postman/collection.json` (add one alongside this once exported from your local Postman). Typical flow:
1. `POST /auth/signup` → copy `accessToken`
2. Set it as a Bearer token on the collection/environment
3. `GET /auth/me` to confirm the session
4. `POST /connections` with another seeded user's id as `addresseeId`
5. Log in as that second user, `GET /connections/pending`, then `PATCH /connections/:id` with `{ "action": "ACCEPT" }`

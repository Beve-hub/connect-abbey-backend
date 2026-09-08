# Connect-abbey — Backend

A REST API for **Connect-abbey**, a professional networking / connections app. Built with **Express**, **TypeScript**, and **Prisma** (PostgreSQL), it implements cookie-based JWT authentication, user profiles, and a LinkedIn-style connection request system (send / accept / reject / remove).

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [Authentication Model](#authentication-model)
- [Data Model](#data-model)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Profile & Users](#profile--users)
  - [Connections](#connections)
- [Error Handling](#error-handling)
- [Testing with Postman](#testing-with-postman)
- [Security Notes](#security-notes)
- [Roadmap Ideas](#roadmap-ideas)
- [License](#license)

---

## Features

- **Authentication** — signup, login, logout, silent token refresh, and a `/me` endpoint, all backed by JWT access + refresh tokens stored in httpOnly cookies.
- **Server-side session revocation** — refresh tokens are tracked in the database (`refresh_tokens` table) rather than trusted blindly, so logout and rotation actually invalidate a session instead of just discarding a cookie client-side.
- **Profiles** — each user has a one-to-one `Profile` (bio, job title, avatar) that can be viewed publicly or edited by its owner.
- **User discovery** — paginated user listing and free-text search (by name/email), annotated with the current user's connection status toward each result (`NONE`, `PENDING_SENT`, `PENDING_RECEIVED`, `ACCEPTED`).
- **Connections** — send a connection request, accept/reject an incoming one, remove an existing connection, and list accepted / pending (incoming) / sent (outgoing) connections.
- **Centralized validation & error handling** — all request bodies are validated with `zod`; a single Express error-handling middleware turns validation errors and thrown `AppError`s into consistent JSON responses.

## Tech Stack

| Concern | Library |
|---|---|
| HTTP framework | [Express 5](https://expressjs.com/) |
| Language | TypeScript |
| ORM / migrations | [Prisma](https://www.prisma.io/) + PostgreSQL |
| Auth tokens | [`jsonwebtoken`](https://www.npmjs.com/package/jsonwebtoken) |
| Password hashing | [`bcryptjs`](https://www.npmjs.com/package/bcryptjs) |
| Validation | [`zod`](https://zod.dev/) |
| Cookies | [`cookie-parser`](https://www.npmjs.com/package/cookie-parser) |
| CORS | [`cors`](https://www.npmjs.com/package/cors) |
| Dev server / hot reload | [`nodemon`](https://www.npmjs.com/package/nodemon) + [`tsx`](https://www.npmjs.com/package/tsx) |

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # User, Profile, Connection, RefreshToken models
│   ├── seed.ts                 # Seeds 3 demo users (password: password123)
│   └── migrations/              # Generated SQL migrations
├── src/
│   ├── config/
│   │   └── cookies.ts           # Cookie names + options for access/refresh tokens
│   ├── controllers/
│   │   ├── auth.controller.ts       # signup, login, refresh, logout, me
│   │   ├── profile.controller.ts    # getMyProfile, updateMyProfile, getUserById, searchUsers
│   │   ├── users.controller.ts      # paginated user listing with connection status
│   │   └── connections.controller.ts# send/respond/remove/list connections
│   ├── lib/
│   │   └── prisma.ts             # Singleton PrismaClient (hot-reload safe)
│   ├── middleware/
│   │   ├── auth.ts               # requireAuth, attachUserIfPresent
│   │   └── errorHandler.ts       # AppError, asyncHandler, central error middleware
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── profile.routes.ts
│   │   ├── users.routes.ts
│   │   └── connections.routes.ts
│   ├── services/
│   │   └── refreshToken.service.ts # issue/validate/revoke refresh sessions
│   ├── utils/
│   │   └── jwt.ts                # sign/verify access & refresh tokens
│   ├── validators/
│   │   ├── auth.validators.ts     # signupSchema, loginSchema
│   │   └── profile.validators.ts  # updateProfileSchema
│   └── index.ts                  # App entrypoint (middleware, routes, error handler)
├── .env.example
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (local via Docker, or a hosted instance)

### Installation

```bash
git clone <your-repo-url>
cd backend
npm install
```

### Environment Variables

Copy the example file and fill in your own values — **never commit a real `.env`**:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (e.g. `8000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret used to sign access tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (e.g. `15m`) |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `MAX_LIMIT` | Optional cap used for pagination/list endpoints |
| `F_URL` | Deployed frontend origin, allowed by CORS |
| `LF_URL` | Local frontend origin (e.g. `http://localhost:5173`), allowed by CORS |

Generate strong random secrets for the JWT variables, for example:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database Setup

```bash
npx prisma migrate dev --name init   # creates tables from prisma/schema.prisma
npm run seed                          # optional: 3 demo users, password: password123
```

### Running the App

```bash
npm run dev     # start with hot reload (nodemon + tsx)
npm run build   # compile TypeScript to dist/
npm start        # run the compiled build (node dist/index.js)
```

The API will be available at `http://localhost:<PORT>` (health check at `GET /health`).

## Authentication Model

Stateless JWTs with server-tracked refresh sessions, delivered as **httpOnly cookies** (not read/stored by client-side JS):

- **Access token** — short-lived (default `15m`). Automatically sent by the browser on every request to the API's origin once set; protected routes read it via `requireAuth`.
- **Refresh token** — longer-lived (default `7d`, scoped to the `/auth` path). Exchanged at `POST /auth/refresh` for a new access token (and a rotated refresh token) once the access token expires.

Each issued refresh token is recorded in the `refresh_tokens` table with a `jti` (JWT ID), so:
- `POST /auth/logout` revokes that specific session server-side.
- `POST /auth/refresh` rotates the token — the old `jti` is revoked and a new one is issued — which limits the damage if a refresh token is ever stolen.

Cookie behavior adapts to environment (`accessCookieOptions` / `refreshCookieOptions` in `src/config/cookies.ts`): `secure` and cross-site `sameSite: "none"` are enabled in production, `sameSite: "lax"` in development.

## Data Model

```
User 1───1 Profile
User 1───* Connection  (as requester)
User 1───* Connection  (as addressee)
User 1───* RefreshToken
```

- `Connection.status` is one of `PENDING | ACCEPTED | REJECTED`.
- A unique constraint on `(requesterId, addresseeId)` prevents duplicate requests in one direction; the controller additionally checks the *reverse* direction so two users can't each have a pending request open toward the other at the same time.
- Deleting a `User` cascades to their `Profile`, `Connection`s, and `RefreshToken`s.

## API Reference

All protected routes expect a valid `access_token` cookie (set automatically by `/auth/signup`, `/auth/login`, or `/auth/refresh`).

### Auth

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/auth/signup` | No | `{ email, password, name }` | Create an account, create an empty `Profile`, and set auth cookies |
| POST | `/auth/login` | No | `{ email, password }` | Validate credentials and set auth cookies |
| POST | `/auth/refresh` | No (uses cookie) | — | Rotate the refresh token and issue a new access token |
| POST | `/auth/logout` | No (best-effort) | — | Revoke the current refresh session and clear cookies |
| GET | `/auth/me` | Yes | — | Return the current user's profile |

### Profile & Users

| Method | Path | Auth | Body / Query | Description |
|---|---|---|---|---|
| GET | `/profile` | Yes | — | Get the current user's own profile |
| PUT | `/profile` | Yes | `{ name?, bio?, jobTitle?, avatarUrl? }` | Update name and/or profile fields (send `avatarUrl: ""` to clear it) |
| GET | `/users/search?q=` | Yes | `q` (query string) | Search other users by name/email fragment (max 20 results) |
| GET | `/users?search=&page=` | Yes | `search?`, `page?` | Paginated user directory, annotated with `connectionStatus` per user |
| GET | `/users/:id` | Yes | — | Public profile of another user |

### Connections

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/connections` | Yes | `{ addresseeId }` | Send a connection request (re-sends automatically if a prior request was `REJECTED`) |
| PATCH | `/connections/:id` | Yes | `{ action: "ACCEPT" \| "REJECT" }` | Respond to an incoming request (addressee only) |
| DELETE | `/connections/:id` | Yes | — | Remove a connection (either party) |
| GET | `/connections` | Yes | — | List the current user's accepted connections |
| GET | `/connections/pending` | Yes | — | List incoming requests awaiting the current user's response |
| GET | `/connections/sent` | Yes | — | List outgoing requests the current user is waiting on |

## Error Handling

All errors flow through a single Express error-handling middleware (`src/middleware/errorHandler.ts`):

- **`ZodError`** (failed request validation) → `422` with a `details` array of `{ path, message }`
- **`AppError`** (thrown intentionally in controllers, e.g. "Invalid email or password") → its own `statusCode` and `message`
- **Anything else** → logged to the console and returned as a generic `500 Internal server error`

Route handlers are wrapped in `asyncHandler`, so any rejected promise (e.g. a failed Prisma query) is automatically forwarded to the error handler instead of crashing the process.

## Testing with Postman

Export a Postman collection (`postman/collection.json`) and use this flow:

1. `POST /auth/signup` (or `/auth/login` with a seeded user) — Postman will store the returned cookies automatically if cookie jar is enabled.
2. `GET /auth/me` to confirm the session is active.
3. `POST /connections` with another user's `id` as `addresseeId`.
4. Log in as that second user, `GET /connections/pending`, then `PATCH /connections/:id` with `{ "action": "ACCEPT" }`.
5. `GET /connections` from either account to confirm the connection now appears.

## Security Notes

- **Never commit `.env`** or any file containing real database credentials or JWT secrets — commit only `.env.example` with placeholder values, and add `.env` to `.gitignore`.
- If a real `DATABASE_URL` or JWT secret has ever been pasted into a chat, committed to a repo, or otherwise shared, treat it as compromised: rotate the database password and regenerate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` before deploying.
- Rotating the JWT secrets immediately invalidates all existing sessions (users will need to log in again) — this is expected and safe.
- Passwords are hashed with `bcryptjs` (10 salt rounds) and never stored or logged in plain text.

## Roadmap Ideas

- Rate limiting on `/auth/login` and `/auth/signup`
- Email verification on signup
- "Revoke all sessions" endpoint (already partially supported via `revokeAllRefreshTokensForUser`)
- Notifications for new connection requests
- OpenAPI/Swagger documentation

## License

ISC

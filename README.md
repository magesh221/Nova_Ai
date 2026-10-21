# Nova AI Backend

Nova AI Backend is an Express.js API backed by MongoDB. It handles authentication, conversation management, AI response generation, streaming, password resets, and per-account daily usage limits.

## Architecture

- **Framework:** Node.js with Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT access and refresh credentials stored in HttpOnly cookies
- **Password security:** bcrypt password hashing
- **AI integration:** OpenAI-compatible chat completions API, including OpenRouter
- **Streaming:** Server-Sent Events (SSE)
- **Email:** SMTP for password reset links
- **Logging:** Structured request logs and request IDs

## Requirements

- Node.js 20.19 or newer (Node.js 22 recommended)
- MongoDB 6.0 or newer
- An API key and model from an OpenAI-compatible AI provider
- SMTP credentials for password reset emails

## Environment Configuration

Create the environment file:

```bash
cp .env.example .env
```

Configure the following variables in `.env`:

- `MONGODB_URI` — MongoDB connection string.
- `JWT_ACCESS_SECRET` — Random secret of at least 32 characters.
- `JWT_REFRESH_SECRET` — A different random secret of at least 32 characters.
- `AI_API_KEY` — AI provider API key.
- `AI_BASE_URL` — AI provider base URL.
- `AI_MODEL` — Model identifier.
- `FRONTEND_URL` — Allowed frontend origin; multiple origins can be comma-separated.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` — SMTP configuration.
- `PASSWORD_RESET_FRONTEND_URL` — Frontend password reset page.
- `AUTH_DAILY_MESSAGE_LIMIT` — Daily AI generation limit; defaults to 100.
- `TRUST_PROXY` — Set to the trusted proxy-hop count when deployed behind a reverse proxy; otherwise use `false`.

Keep all secrets in the backend environment. Never commit `.env` files.

## Installation and Startup

```bash
npm install
npm start
```

For local development with automatic restarts, run `npm run loc`. The production start command is `npm start`. The server binds to all network interfaces and uses the platform-provided `PORT`, falling back to `8690` locally.

## Deployment with Docker

Build and run the production image (configure the required environment variables from the section above in your hosting platform; do not copy `.env` into the image):

```bash
docker build -t nova-ai-api .
docker run --rm -p 8690:8690 --env-file .env -e PORT=8690 nova-ai-api
```

For a cloud platform that builds from this repository, use `npm ci --omit=dev` as the install command and `npm start` as the start command. Set a Node.js 22 runtime and configure the required variables in the platform's secret/environment settings. The HTTP server starts before MongoDB finishes connecting and retries database connection every five seconds; configure the health check to use `/api/v1/ready`, which returns `503` until MongoDB is connected. `/api/v1/health` only reports that the HTTP process is alive.

## API Routes

All API v1 routes are prefixed with `/api/v1`.

| Method | Endpoint | Access |
|---|---|---|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/logout` | Signed-in session |
| POST | `/auth/refresh` | Refresh cookie |
| GET | `/auth/me` | Signed in |
| POST | `/auth/forgot-password` | Public, rate limited |
| POST | `/auth/reset-password` | Reset token |
| GET / POST | `/conversations` | Signed in |
| GET | `/conversations/search?q=...` | Signed in |
| GET / PATCH / DELETE | `/conversations/:id` | Conversation owner |
| GET | `/conversations/:id/messages` | Conversation owner |
| POST | `/conversations/:id/messages` | Conversation owner |
| POST | `/conversations/:id/messages/:messageId/regenerate` | Conversation owner |
| POST | `/conversations/:id/messages/:messageId/stop` | Conversation owner |
| GET | `/health` | Public |
| GET | `/ready` | Public |

## AI Chat Features

- Streams AI responses using SSE events: `start`, `delta`, `done`, and `error`.
- Stores user messages and completed or failed assistant attempts in MongoDB.
- Uses bounded recent conversation context.
- Supports message retries and assistant response regeneration.
- Enforces daily AI generation quotas for signed-in users.
- Uses stable `clientMessageId` values to prevent duplicate user messages on retries.
- Prevents users from accessing other accounts' conversations.

## Security

- Stores access and refresh credentials in HttpOnly cookies.
- Hashes refresh tokens and password reset tokens before storing them.
- Enforces authentication and conversation ownership on private routes.
- Keeps AI provider credentials on the server.
- Uses rate limiting for authentication and short-window IP requests.
- Supports graceful shutdown of the HTTP server and MongoDB connection.
- Recommends HTTPS, Secure cookies, restricted CORS origins, and appropriate MongoDB network access in production.

## Health Checks

- `GET /api/v1/health` — Checks API process liveness.
- `GET /api/v1/ready` — Checks API and MongoDB readiness.

## Testing

```bash
npm test
```

Before production deployment, test authentication, streaming, conversation ownership, rate limits, provider failures, password resets, and graceful shutdown.


# Parking Garage Server

Express, TypeScript, PostgreSQL, and Prisma backend for the multi-tenant parking platform.

## Local setup

```bash
cd server
npm install
cp .env.example .env
npm run db:up
npx prisma migrate deploy
npm run dev
```

The API runs on `http://localhost:5000` and the health check is `GET /health`.

Stop the local database with `npm run db:down`.

For production, set a strong `JWT_SECRET`, a real `DATABASE_URL`, `NODE_ENV=production`, and the frontend origin in `CLIENT_URL`.

## Commands

- `npm run dev`: start the TypeScript watcher
- `npm run build`: compile to `dist`
- `npm run start`: run the compiled server
- `npm run lint`: run the TypeScript check
- `npm test`: run server unit tests
- `npm run check`: run lint, tests, build, and Prisma validation
- `npm run db:up`: start PostgreSQL with Docker Compose
- `npm run db:down`: stop the local PostgreSQL container
- `npx prisma migrate deploy`: apply committed migrations
- `npx prisma generate`: regenerate the Prisma client

## Authentication

`POST /api/auth/register` creates a tenant and its owner. `POST /api/auth/login` issues a short-lived `httpOnly` `accessToken` cookie. The API also accepts `Authorization: Bearer <token>` for non-browser clients.

Registration body:

```json
{
  "tenantName": "Downtown Garage",
  "tenantEmail": "owner@example.com",
  "name": "Garage Owner",
  "email": "owner@example.com",
  "password": "at-least-8-characters"
}
```

## API groups

- `/api/auth`: register, login, logout
- `/api/garages`: tenant-scoped garage CRUD
- `/api/floors`: floor CRUD and garage floor listing
- `/api/spots`: spot CRUD and garage availability
- `/api/rate-policies`: billing policy CRUD
- `/api/vehicles`: vehicle registration, updates, and active status lookup
- `/api/tickets`: transactional check-in, check-out, ticket lookup, and garage history
- `/api/reports`: daily, monthly, and garage revenue summaries
- `/api/audit`: tenant and garage audit history

All non-auth resources require a valid token and enforce tenant ownership on the server. Check-in and check-out operations update tickets, spots, billing, and audit records transactionally.

# Parking Garage Platform

A multi-tenant parking garage operations platform for garage owners, managers, attendants, and auditors.

The system manages garages, floors, parking bays, vehicles, active parking tickets, rate policies, checkout billing, reports, and audit history.

## Quick Start

Use these commands from the repository root:

```bash
cd /Users/gauravrawat/Desktop/parking_garage

npm --prefix server install
npm --prefix client install

cp server/.env.example server/.env
cp client/.env.example client/.env
```

Then choose one database option.

### Option A: Local PostgreSQL with Docker

Prerequisites: Docker Desktop must be running.

```bash
npm --prefix server run db:up
npm --prefix server run db:migrate
```

### Option B: Neon PostgreSQL

1. Create a project at [Neon](https://neon.tech/).
2. Copy the Neon PostgreSQL connection string.
3. Put it in `server/.env` as `DATABASE_URL`.
4. Apply the committed migration:

```bash
npm --prefix server run db:migrate
```

Finally, start the applications in separate terminals:

```bash
npm --prefix server run dev
npm --prefix client run dev
```

Open the frontend at `http://localhost:5173`.

The backend runs at `http://localhost:5000`.

Health check:

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "parking-garage-server"
}
```

## Technology Stack

### Client

- React 18
- TypeScript
- Vite 8
- Tailwind CSS
- Zustand global state management
- Centralized CSS theme tokens
- Page/component architecture

### Server

- Node.js 20+
- Express 4
- TypeScript strict mode
- PostgreSQL
- Prisma ORM 5.22.0
- JWT access tokens
- HTTP-only cookies
- bcrypt 6.0.0

### Quality and operations

- Prisma migrations
- Docker Compose for local PostgreSQL
- Node test runner through `tsx`
- GitHub Actions CI
- npm lockfiles
- dependency auditing
- health endpoint
- graceful shutdown

## Requirements

Install the following before setup:

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop for local PostgreSQL, or a managed PostgreSQL provider such as Neon
- Git

Verify the runtime:

```bash
node --version
npm --version
docker --version
```

Docker is only required when using the local PostgreSQL option.

## Environment Configuration

Never commit `.env` files or real passwords. The repository contains safe templates:

- `server/.env.example`
- `client/.env.example`

### Server environment

Create `server/.env`:

```env
# PostgreSQL or Neon connection string.
# Neon example:
# postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require&channel_binding=require
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/parking_garage"

# Express port.
PORT=5000

# Use a long random value in production.
# Generate one with: openssl rand -base64 48
JWT_SECRET="replace-with-a-long-random-secret"

# development or production
NODE_ENV="development"

# Allowed browser origin for credentialed requests.
CLIENT_URL="http://localhost:5173"
```

Production requirements:

- use a managed PostgreSQL connection string
- use a strong random `JWT_SECRET`
- set `NODE_ENV=production`
- set `CLIENT_URL` to the deployed frontend origin
- use HTTPS so secure cookies are enabled
- store secrets in the deployment platform secret manager

### Client environment

Create `client/.env`:

```env
VITE_API_URL="http://localhost:5000"
```

For a deployed API:

```env
VITE_API_URL="https://api.example.com"
```

The client sends cookies with requests using `credentials: include`.

## Database Commands

All database commands run from the repository root with the server prefix.

```bash
# Start local PostgreSQL
npm --prefix server run db:up

# Stop local PostgreSQL
npm --prefix server run db:down

# Apply committed migrations in any environment
npm --prefix server run db:migrate

# Check migration state
npm --prefix server exec prisma migrate status -- --schema prisma/schema.prisma

# Generate Prisma Client
npm --prefix server exec prisma generate -- --schema prisma/schema.prisma

# Validate the schema
npm --prefix server exec prisma validate -- --schema prisma/schema.prisma

# Open Prisma Studio
npm --prefix server exec prisma studio -- --schema prisma/schema.prisma
```

The initial migration is stored at:

`server/prisma/migrations/0001_init/migration.sql`

The migration includes PostgreSQL partial unique indexes that enforce:

- one active ticket per vehicle
- one active ticket per parking spot
- unlimited historical checked-out tickets

## Running the Project

### Development

Terminal 1:

```bash
npm --prefix server run dev
```

Terminal 2:

```bash
npm --prefix client run dev
```

### Production-like local run

```bash
npm --prefix server run build
npm --prefix server run start
```

Build the frontend:

```bash
npm --prefix client run build
```

Preview the frontend production bundle:

```bash
npm --prefix client run preview
```

## Complete Product Flow

This section explains how a real user operates the platform from the first visit through daily garage management. It also gives automation tools a deterministic sequence for exercising the application.

### 1. Start the platform

1. Configure `server/.env` with PostgreSQL or Neon.
2. Configure `client/.env` with the backend URL.
3. Apply the Prisma migration.
4. Start the server.
5. Start the Vite client.
6. Open `http://localhost:5173`.
7. Confirm `GET /health` returns a healthy response before using the client.

The server connects to PostgreSQL during startup. If the database, `DATABASE_URL`, or production JWT secret is invalid, startup fails clearly instead of running with an unsafe partial configuration.

### 2. Create the first workspace

The first user selects the registration flow on the login screen. Registration creates two records in one transaction:

- a `Tenant`, representing the garage business workspace
- an owner `User`, representing the first administrator

Registration fields:

- garage group or tenant name
- tenant email
- owner name
- owner email
- password of at least eight characters

The server hashes the password with bcrypt, creates the tenant and owner together, signs a JWT, and sends the token in an HTTP-only `accessToken` cookie.

If tenant creation succeeds but owner creation fails, the transaction rolls back so an incomplete workspace is not left behind.

### 3. Sign in

An existing user enters:

- email
- password
- tenant ID when the same email exists in more than one tenant

The server:

1. looks up the user within the requested tenant scope
2. verifies the password hash
3. checks that the account is active
4. creates a short-lived JWT
5. stores the JWT in an HTTP-only cookie

The browser automatically sends the cookie on later API requests. Non-browser automation may instead send:

```http
Authorization: Bearer <access-token>
```

Invalid credentials return `401`. Missing credentials on a protected resource also return `401`. A valid user with an insufficient role receives `403`.

### 4. Select or create a garage

After login, the dashboard loads garages belonging only to the authenticated tenant. The user can:

- select an existing garage from the workspace selector
- create another garage
- view garage address, timezone, floors, bays, and active ticket counts
- update garage metadata
- delete a garage only when it has no active tickets

Garage ownership is checked by the backend on every request. A user cannot access another tenant's garage by changing an ID in the browser.

Create a garage with:

```json
{
  "name": "Central Market Garage",
  "address": "100 Main Street",
  "timezone": "America/New_York"
}
```

### 5. Configure floors

A garage owner or manager opens **Garage setup** and adds floors. A floor has:

- display name
- integer level
- active/inactive status

The garage-level floor number is unique. For example, a garage cannot have two floors both using level `1`.

Create a floor:

```json
{
  "name": "Level 1",
  "level": 1
}
```

A floor with parking bays cannot be deleted. This preserves the physical inventory history and prevents accidental cascading deletion from the operator interface.

### 6. Configure parking bays

Inside a floor, the user adds parking bays. Each bay has:

- floor ID
- bay number
- vehicle compatibility type
- optional label
- operational status

Supported types:

- `COMPACT`
- `STANDARD`
- `EV`

Create a bay:

```json
{
  "floorId": "floor-uuid",
  "spotNumber": "A-101",
  "type": "STANDARD",
  "label": "Near entrance"
}
```

The database prevents duplicate bay numbers within the same garage and floor. A bay with ticket history cannot be deleted; it should be marked `MAINTENANCE` instead.

### 7. Configure rate policies

Before check-in, a garage needs an active rate policy. The policy controls the amount charged at checkout:

- first-hour rate
- additional-hour rate
- daily cap
- currency
- rounding mode
- optional validity start and end dates

Create a rate policy:

```json
{
  "name": "Standard hourly",
  "firstHourRate": 5,
  "additionalHourRate": 3,
  "dailyCap": 30,
  "currency": "USD",
  "roundingMode": "UP_TO_NEXT_HOUR"
}
```

The backend rejects:

- negative rates
- non-numeric or `NaN` rates
- a daily cap lower than the first-hour rate

At check-in, the server selects the requested policy or the newest active policy valid at the current time. The frontend never chooses or calculates the authoritative final charge.

### 8. Register a vehicle

The vehicle desk allows an operator to save a vehicle before it arrives. The plate is normalized to uppercase and trimmed before persistence.

Vehicle fields include:

- plate number
- vehicle type
- EV flag
- color
- make
- model

The tenant cannot register the same normalized plate twice. A plate lookup returns the vehicle and its active ticket, if one exists.

### 9. Check in a vehicle

An attendant opens **Floor control**, chooses **Check in**, and enters:

- garage ID, selected by the active workspace
- license plate
- vehicle type
- optional preferred bay
- optional rate policy

The backend performs the complete operation transactionally:

1. verifies the garage belongs to the tenant and is active
2. finds or creates the normalized vehicle
3. rejects the vehicle if it already has an active ticket
4. selects a compatible active rate policy
5. finds the requested bay or automatically selects the first compatible available bay
6. conditionally changes the bay from `AVAILABLE` to `OCCUPIED`
7. creates the active ticket
8. stores the policy currency on the ticket
9. writes a `CHECKED_IN` audit event
10. commits the transaction

The operation fails safely when:

- the garage is missing or inactive
- the vehicle does not exist when an existing vehicle ID is supplied
- no active rate policy exists
- no compatible bay is available
- another attendant claimed the selected bay first
- the vehicle already has an active ticket

An EV can only be checked into an EV bay. This is enforced by the server query and cannot be bypassed by changing frontend form data.

### 10. Monitor live availability

The dashboard and floor control screen request availability grouped by:

- vehicle type
- bay status

The interface displays available EV, compact, and standard bays, occupied counts, and active sessions. The availability endpoint is calculated from persisted bay state rather than a client-side counter.

Endpoint:

```text
GET /api/spots/garage/:garageId/availability
```

### 11. Find a vehicle by plate

At the gate or service desk, an operator opens **Vehicle desk**, enters a plate, and submits the lookup. The server normalizes the plate and returns:

- stored vehicle information
- vehicle type
- current active ticket, if any
- garage name
- assigned bay

This supports questions such as:

- Is this car currently inside?
- Which bay is it using?
- Does this vehicle have an active session?

### 12. Check out a vehicle

An attendant opens **Floor control**, selects **Check out**, and enters either:

- ticket ID
- license plate

The server:

1. finds the active ticket inside the tenant scope
2. captures checkout time
3. calculates elapsed hours
4. rounds partial hours upward
5. applies first-hour and additional-hour rates
6. applies the daily cap
7. atomically changes the ticket to `CHECKED_OUT`
8. persists checkout time, amount, currency, and operator
9. changes the assigned bay back to `AVAILABLE`
10. writes a `CHECKED_OUT` audit event

Example calculation with a policy of `$5` first hour, `$3` additional hour, and `$30` daily cap:

- 30 minutes: `$5`
- 1 hour 10 minutes: 2 billable hours, `$8`
- 2 hours 1 minute: 3 billable hours, `$11`
- 20 hours: capped at `$30`

Concurrent checkout requests cannot close the same ticket twice. Only the request that changes the ticket while it is still `ACTIVE` succeeds.

### 13. Review reports

Owners, managers, and auditors can open **Reports**. The report pages call:

- daily revenue
- monthly revenue
- garage-specific revenue

Reports count completed tickets and sum persisted checkout amounts. Active tickets are not counted as settled revenue.

Optional periods:

```text
GET /api/reports/daily?date=2026-09-17
GET /api/reports/monthly?month=2026-09
GET /api/reports/garage/:garageId?date=2026-09-17
```

The report dates are interpreted as UTC in the current implementation. A future timezone-aware reporting enhancement should use each garage's configured timezone before calculating local business days.

### 14. Review the audit trail

Owners, managers, and auditors can open **Audit trail**. Important actions create audit events, including:

- garage creation, update, and deletion
- bay creation, update, and deletion
- vehicle check-in
- vehicle checkout
- billing details

Audit records contain:

- tenant ID
- optional garage ID
- optional user ID
- entity type and entity ID
- action
- details
- optional before/after JSON snapshots
- creation timestamp

Audit endpoints support pagination with `page` and `limit`, where the maximum limit is `100`.

### 15. Logout and session end

When the user selects sign out, the client calls `POST /api/auth/logout`. The server clears the HTTP-only access cookie. The client returns to the authentication screen and removes its in-memory user and garage state.

### 16. Role-based daily use

#### Owner

- register the tenant
- create and update garages
- configure floors, bays, and rate policies
- register and update vehicles
- operate check-in and checkout
- view reports and audit history
- delete garages when safe

#### Manager

- configure garages, floors, bays, and rate policies
- register and update vehicles
- operate check-in and checkout
- view reports and audit history

#### Attendant

- register vehicles
- look up vehicles
- check vehicles in
- check vehicles out
- view operational ticket data

#### Auditor

- view revenue reports
- view tenant and garage audit history

#### Super admin

The role exists in the domain model for future platform-level administration. Tenant-facing routes should be extended deliberately when super-admin workflows are implemented.

### 17. Normal failure and recovery flow

The UI displays backend errors instead of pretending an operation succeeded.

- `400`: correct the request fields or payload values
- `401`: sign in again or provide valid credentials
- `403`: use an account with the required role
- `404`: verify the selected garage, floor, vehicle, or ticket exists
- `409`: resolve the state conflict, such as no available bay or an already active ticket
- `500`: inspect backend logs, database connectivity, and migration state

For a database failure:

1. check `server/.env`
2. check Neon or Docker availability
3. run `npm --prefix server run db:migrate`
4. run `npm --prefix server exec prisma migrate status -- --schema prisma/schema.prisma`
5. restart the server

For a frontend API failure:

1. check `client/.env`
2. confirm the backend is running on the configured URL
3. check `CLIENT_URL` matches the browser origin
4. inspect browser Network requests
5. check whether the access cookie is present

### 18. Automation walkthrough

An automation tool can exercise the platform in this order:

1. install server and client dependencies with `npm ci`
2. configure `server/.env` and `client/.env`
3. apply the Prisma migration
4. start the backend
5. assert `GET /health` returns `200`
6. register a tenant owner
7. retain the returned cookie or JWT
8. create a garage
9. create a floor
10. create standard and EV bays
11. create an active rate policy
12. register a vehicle or provide vehicle details at check-in
13. check in a standard vehicle
14. assert the response includes an active ticket and assigned bay
15. query availability and assert the bay is occupied
16. look up the vehicle by plate
17. check out the vehicle
18. assert the fee and checkout timestamp are present
19. assert the bay becomes available again
20. request reports
21. request audit logs
22. run server and client quality checks

The automation must never bypass the API by writing directly to client state. The database and server responses are the authoritative result of each action.

## Debugging

### Backend with TypeScript inspector

From the repository root:

```bash
cd server
node --inspect --import tsx src/index.ts
```

Then attach VS Code or Chrome DevTools to port `9229`.

For the watcher with inspector support:

```bash
cd server
tsx watch --inspect src/index.ts
```

Useful backend checks:

```bash
curl -i http://localhost:5000/health
curl -i http://localhost:5000/api/garages
```

The second request should return `401` when no authentication cookie or Bearer token is supplied.

### Frontend debugging

```bash
npm --prefix client run dev
```

Use browser DevTools to inspect:

- Network requests to `VITE_API_URL`
- cookies and credentialed requests
- `401` and `403` authorization responses
- JSON validation errors
- frontend page state

The browser must be opened from the Vite origin configured in `CLIENT_URL`.

### Database debugging

```bash
npm --prefix server exec prisma studio -- --schema prisma/schema.prisma
npm --prefix server exec prisma migrate status -- --schema prisma/schema.prisma
```

Check the server logs for:

- database connection failures
- migration failures
- JWT configuration errors
- transaction errors
- unexpected 500 responses

## Validation and Test Commands

### Server quality gate

```bash
npm --prefix server run lint
npm --prefix server test
npm --prefix server run build
npm --prefix server exec prisma validate -- --schema prisma/schema.prisma
npm --prefix server audit --omit=dev --audit-level=high
```

Run the complete server gate:

```bash
npm --prefix server run check
```

`npm run check` performs:

1. TypeScript validation
2. unit tests
3. production compilation
4. Prisma schema validation

### Client quality gate

```bash
npm --prefix client run lint
npm --prefix client run build
npm --prefix client audit --audit-level=high
```

Run the complete client gate:

```bash
npm --prefix client run check
```

### Full repository validation

```bash
npm --prefix server run check
npm --prefix client run check
npm --prefix server audit --omit=dev --audit-level=high
npm --prefix client audit --audit-level=high
```

## CI Automation

CI is defined in `.github/workflows/ci.yml`.

On pushes to `main` and pull requests, CI runs separate jobs for server and client:

### Server CI

- checkout repository
- install Node 20
- run `npm ci` from `server`
- run `npm run check`
- run production dependency audit

### Client CI

- checkout repository
- install Node 20
- run `npm ci` from `client`
- run `npm run check`
- run dependency audit

Use `npm ci` in automation because it installs exactly from the committed lockfile.

## API Authentication

All endpoints except registration and login require authentication.

The server accepts either:

1. `accessToken` HTTP-only cookie, used by the browser client
2. `Authorization: Bearer <JWT>` header, useful for API clients and automation

JWT claims:

```json
{
  "id": "user-id",
  "tenantId": "tenant-id",
  "role": "OWNER",
  "email": "owner@example.com"
}
```

Roles:

- `SUPER_ADMIN`: platform administration role
- `OWNER`: full tenant ownership operations
- `MANAGER`: garage configuration and operations
- `ATTENDANT`: vehicle and ticket operations
- `AUDITOR`: reports and audit access

## API Endpoint Reference

Base URL:

```text
http://localhost:5000
```

All request bodies use JSON. Protected routes require the access-token cookie or Bearer token.

### Health

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | No | Server health check |

### Authentication

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create a tenant and its owner |
| POST | `/api/auth/login` | No | Verify credentials and set access cookie |
| POST | `/api/auth/logout` | Yes | Clear access cookie |

Registration example:

```json
{
  "tenantName": "Downtown Garage Group",
  "tenantEmail": "owner@example.com",
  "name": "Garage Owner",
  "email": "owner@example.com",
  "password": "at-least-8-characters"
}
```

Login example:

```json
{
  "email": "owner@example.com",
  "password": "at-least-8-characters",
  "tenantId": "optional-when-email-is-unique"
}
```

### Garages

All garage routes require authentication.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/api/garages` | Any authenticated role | List tenant garages |
| POST | `/api/garages` | OWNER, MANAGER | Create a garage |
| GET | `/api/garages/:id` | Any authenticated role | Get garage details |
| PUT | `/api/garages/:id` | OWNER, MANAGER | Update a garage |
| DELETE | `/api/garages/:id` | OWNER | Delete a garage without active tickets |

Create garage body:

```json
{
  "name": "Central Market Garage",
  "address": "100 Main Street",
  "timezone": "America/New_York"
}
```

### Floors

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/api/floors/garage/:garageId` | Any authenticated role | List garage floors |
| POST | `/api/floors/garage/:garageId` | OWNER, MANAGER | Create a floor |
| PUT | `/api/floors/:id` | OWNER, MANAGER | Update a floor |
| DELETE | `/api/floors/:id` | OWNER, MANAGER | Delete a floor without spots |

Create floor body:

```json
{
  "name": "Level 1",
  "level": 1
}
```

### Parking spots

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/api/spots/garage/:garageId` | Any authenticated role | List spots |
| POST | `/api/spots/garage/:garageId` | OWNER, MANAGER | Create a spot |
| GET | `/api/spots/garage/:garageId/availability` | Any authenticated role | Group availability by type and status |
| PUT | `/api/spots/:id` | OWNER, MANAGER | Update spot metadata/status |
| DELETE | `/api/spots/:id` | OWNER, MANAGER | Delete a spot without ticket history |

Create spot body:

```json
{
  "floorId": "floor-uuid",
  "spotNumber": "A-101",
  "type": "STANDARD",
  "label": "Near entrance"
}
```

Valid spot types:

- `COMPACT`
- `STANDARD`
- `EV`

Valid statuses:

- `AVAILABLE`
- `OCCUPIED`
- `MAINTENANCE`

### Rate policies

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/api/rate-policies/garage/:garageId` | Any authenticated role | List garage rate policies |
| POST | `/api/rate-policies/garage/:garageId` | OWNER, MANAGER | Create a rate policy |
| PUT | `/api/rate-policies/:id` | OWNER, MANAGER | Update a rate policy |

Create rate policy body:

```json
{
  "name": "Standard hourly",
  "firstHourRate": 5,
  "additionalHourRate": 3,
  "dailyCap": 30,
  "currency": "USD",
  "roundingMode": "UP_TO_NEXT_HOUR"
}
```

### Vehicles

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/api/vehicles` | OWNER, MANAGER, ATTENDANT | Register a vehicle |
| GET | `/api/vehicles/:plate/status` | Any authenticated role | Find vehicle and active ticket |
| PUT | `/api/vehicles/:id` | OWNER, MANAGER | Update vehicle record |

Create vehicle body:

```json
{
  "plateNumber": "8ABC123",
  "vehicleType": "STANDARD",
  "isElectric": false,
  "color": "White",
  "make": "Example",
  "model": "Sedan"
}
```

Valid vehicle types:

- `COMPACT`
- `STANDARD`
- `EV`

### Tickets and parking sessions

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/api/tickets/check-in` | OWNER, MANAGER, ATTENDANT | Start a parking session |
| POST | `/api/tickets/check-out` | OWNER, MANAGER, ATTENDANT | Calculate fee and close a session |
| GET | `/api/tickets/:id` | Any authenticated role | Get ticket details |
| GET | `/api/tickets/garage/:garageId` | Any authenticated role | List garage tickets |

Check-in body:

```json
{
  "garageId": "garage-uuid",
  "plateNumber": "8ABC123",
  "vehicleType": "STANDARD",
  "spotId": "optional-spot-uuid",
  "ratePolicyId": "optional-policy-uuid"
}
```

Check-out body:

```json
{
  "ticketId": "optional-ticket-uuid",
  "plateNumber": "optional-plate-number"
}
```

Check-in enforces:

- active garage ownership
- normalized license plates
- one active ticket per vehicle
- compatible vehicle and spot type
- active, time-valid rate policy
- atomic spot claiming
- audit logging

Checkout enforces:

- active-ticket lookup
- rounded-up hourly billing
- daily cap
- atomic ticket closure
- spot release
- audit logging

### Reports

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/api/reports/daily` | OWNER, MANAGER, AUDITOR | Tenant daily revenue summary |
| GET | `/api/reports/monthly` | OWNER, MANAGER, AUDITOR | Tenant monthly revenue summary |
| GET | `/api/reports/garage/:garageId` | OWNER, MANAGER, AUDITOR | Garage revenue summary |

Optional query parameters:

- daily: `?date=2026-09-17`
- monthly: `?month=2026-09`
- garage: `?date=2026-09-17`

### Audit logs

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/api/audit` | OWNER, MANAGER, AUDITOR | List tenant audit events |
| GET | `/api/audit/garage/:garageId` | OWNER, MANAGER, AUDITOR | List garage audit events |

Pagination query parameters:

- `page`, default `1`
- `limit`, default `50`, maximum `100`

## Error Responses

Common response statuses:

- `400`: malformed or invalid request data
- `401`: missing, invalid, or expired authentication
- `403`: authenticated but role is not allowed
- `404`: resource or route does not exist
- `409`: duplicate record or state conflict
- `500`: unexpected server/database failure

Example:

```json
{
  "message": "This vehicle already has an active ticket."
}
```

## Production Practices

The implementation includes:

- strict TypeScript compilation
- pinned Prisma CLI/client versions
- committed database migrations
- tenant-scoped queries
- relational foreign keys
- active-state partial unique indexes
- transactional ticket operations
- HTTP-only cookie authentication
- role-based authorization
- bounded JSON request bodies
- graceful Prisma shutdown
- health endpoint
- dependency vulnerability audits
- server unit tests
- production client/server builds
- GitHub Actions CI
- lockfile-based `npm ci` installs

Before a high-volume launch, add full HTTP integration tests, browser E2E tests, rate limiting, structured logging, request IDs, metrics, tracing, backups, restoration drills, and load testing.

## Project Structure

```text
parking_garage/
├── .github/workflows/ci.yml
├── client/
│   ├── src/app/              # application composition
│   ├── src/components/       # shared UI components
│   ├── src/pages/            # product workflows
│   ├── src/lib/api.ts        # typed HTTP boundary
│   ├── src/stores/           # Zustand global application state
│   ├── src/types/            # frontend domain types
│   ├── src/utils/            # pure display helpers
│   └── src/styles/           # theme and global styles
├── server/
│   ├── prisma/               # schema and migrations
│   ├── src/config/           # Prisma client configuration
│   ├── src/controllers/      # HTTP request handlers
│   ├── src/middleware/       # authentication and authorization
│   ├── src/routes/           # endpoint registration
│   ├── src/services/         # reusable business logic
│   ├── src/utils/            # password and controller helpers
│   └── test/                 # automated server tests
├── README.md                 # setup, debug, API, automation guide
├── REASONING.md              # engineering decisions and rationale
├── AI_LOGS.md                # immutable conversation history
└── process.md                # product architecture notes
```

## Important Automation Keywords

`parking garage`, `garage management`, `parking management`, `multi-tenant`, `tenant isolation`, `React`, `TypeScript`, `Vite`, `Node.js`, `Express`, `PostgreSQL`, `Prisma`, `JWT`, `bcrypt`, `httpOnly cookie`, `RBAC`, `role-based authorization`, `transaction`, `concurrency`, `double-booking prevention`, `active ticket uniqueness`, `partial unique index`, `EV parking`, `spot assignment`, `check-in`, `check-out`, `billing`, `daily cap`, `audit log`, `revenue report`, `health check`, `database migration`, `Prisma generate`, `Prisma validate`, `npm ci`, `npm test`, `npm run build`, `npm audit`, `GitHub Actions`, `CI/CD`, `deployment`, `rollback`, `monitoring`, `backup`, `smoke test`, `integration test`, `E2E test`, `production readiness`.

## Related Documentation

- [REASONING.md](REASONING.md): engineering decisions, data invariants, and production practices
- [server/README.md](server/README.md): backend-specific commands
- [client/README.md](client/README.md): frontend-specific structure and commands
- [process.md](process.md): product architecture and domain design
- [AI_LOGS.md](AI_LOGS.md): immutable AI conversation history

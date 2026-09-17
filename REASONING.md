# Parking Garage Platform: Engineering Reasoning

## 1. Purpose

This document explains how the parking garage platform was designed and built from the initial problem statement to the current implementation. It records the decisions that control correctness, security, maintainability, testing, automation, and production operation.

The product is an operator platform for garage owners and attendants. It manages multiple tenants, garages, floors, parking bays, vehicles, active parking tickets, pricing, checkout, reports, and audit history.

The central engineering requirement is:

> Every active vehicle must have exactly one valid parking session, every active bay must belong to at most one vehicle, and every charge must be calculated by the server from persisted policy data.

## 2. Product Requirements

### Core workflows

- Owner registration and tenant creation
- Cookie-based login and logout
- Role-based operator access
- Multiple garages per tenant
- Floor and parking-bay configuration
- Vehicle registration and license-plate lookup
- EV-compatible bay assignment
- Vehicle check-in
- Automatic or requested bay assignment
- Vehicle checkout and billing
- Daily and monthly revenue reports
- Tenant and garage audit history
- Responsive operator dashboard

### Non-functional requirements

- Multi-tenant data isolation
- Server-authoritative business rules
- Atomic parking state changes
- Historical ticket preservation
- Strong relational integrity
- Secure password storage
- Short-lived access tokens
- Production dependency hygiene
- Reproducible migrations
- Automated build and test checks
- Clear ownership boundaries in the codebase

## 3. Design Principles

### Backend and database own correctness

The frontend is an operator interface, not a source of truth. A browser can be modified, requests can be replayed, and multiple operators can act simultaneously. Therefore the backend and database enforce:

- tenant ownership
- role permissions
- compatible vehicle and bay types
- active-ticket uniqueness
- ticket lifecycle transitions
- pricing policy selection
- billing calculations
- audit records

### Small ownership boundaries

Each layer has one primary responsibility:

- pages coordinate a user workflow
- components render reusable UI
- the API client owns HTTP communication
- controllers translate HTTP requests into domain operations
- services contain reusable business calculations
- Prisma schema and migrations own persistence structure
- middleware owns authentication and authorization
- CI owns repeatable validation

### Prefer explicit failure

Invalid configuration, missing secrets, unavailable databases, malformed JSON, missing records, duplicate records, and unauthorized access return explicit errors. The server does not silently continue with an invalid database or token configuration.

## 4. Technology Decisions

### React, TypeScript, and Vite

React provides the operator interface, TypeScript catches contract errors before runtime, and Vite provides a fast development server and production bundler.

The frontend uses a component/page structure instead of a single component file. Vite is pinned to a patched release and its production bundle is checked in CI.

### Node.js, Express, and TypeScript

Express is used for HTTP routing and middleware. TypeScript provides strict server-side contracts and makes Prisma operations type-safe. The server starts through `tsx` in development and compiled JavaScript in production.

### PostgreSQL

PostgreSQL was selected because this domain needs:

- transactions
- foreign keys
- unique constraints
- partial indexes
- decimal money fields
- relational reporting
- durable audit history

A document-only database would make active-ticket uniqueness and historical relationships harder to protect.

### Prisma ORM

Prisma provides a typed schema, generated client, migration workflow, and explicit relational queries. Prisma CLI and `@prisma/client` are pinned to `5.22.0` so generated types cannot drift from migration tooling.

### bcrypt

Passwords are hashed with bcrypt. The production dependency is pinned to `6.0.0`, which removes the previously reported runtime dependency advisories from the older native package chain.

### Cookies and JWT

Access tokens are stored in `httpOnly` cookies so browser JavaScript cannot directly read them. The middleware also accepts a Bearer token for non-browser clients and automation. Tokens are short-lived and claims are validated before a request becomes authenticated.

## 5. Final Folder Structure

```text
parking_garage/
├── .github/
│   └── workflows/
│       └── ci.yml
├── client/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   └── App.tsx
│   │   ├── components/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Feedback.tsx
│   │   │   ├── FormControls.tsx
│   │   │   └── StatCard.tsx
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx
│   │   │   ├── OverviewPage.tsx
│   │   │   ├── OperationsPage.tsx
│   │   │   ├── GaragesPage.tsx
│   │   │   ├── VehiclesPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   └── AuditPage.tsx
│   │   ├── styles/
│   │   │   ├── index.css
│   │   │   └── theme.css
│   │   ├── types/
│   │   │   └── app.ts
│   │   ├── utils/
│   │   │   └── format.ts
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── README.md
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   │   ├── migration_lock.toml
│   │   │   └── 0001_init/migration.sql
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   └── prisma.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── garageController.ts
│   │   │   ├── floorController.ts
│   │   │   ├── spotController.ts
│   │   │   ├── vehicleController.ts
│   │   │   ├── ratePolicyController.ts
│   │   │   ├── ticketController.ts
│   │   │   ├── reportController.ts
│   │   │   └── auditController.ts
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── garageRoutes.ts
│   │   │   ├── floorRoutes.ts
│   │   │   ├── spotRoutes.ts
│   │   │   ├── vehicleRoutes.ts
│   │   │   ├── ratePolicyRoutes.ts
│   │   │   ├── ticketRoutes.ts
│   │   │   ├── reportRoutes.ts
│   │   │   └── auditRoutes.ts
│   │   ├── services/
│   │   │   └── billingService.ts
│   │   ├── utils/
│   │   │   ├── controller.ts
│   │   │   └── password.ts
│   │   └── index.ts
│   ├── test/
│   │   └── billingService.test.ts
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── package.json
│   └── README.md
├── README.md
├── REASONING.md
├── process.md
├── AI_LOGS.md
└── .gitignore
```

`AI_LOGS.md` is historical source material and must not be modified. `REASONING.md` is the canonical engineering decision record.

## 6. Backend Request Flow

A protected request follows this path:

1. Express receives the request.
2. CORS, JSON parsing, and cookies are processed.
3. Route middleware reads the access token from the cookie or Authorization header.
4. JWT signature and required claims are validated.
5. Role middleware checks the user role.
6. The controller validates request input and tenant scope.
7. Prisma reads or writes the database.
8. Critical state transitions run inside a transaction.
9. Audit records are written with the state change.
10. The controller returns a stable JSON response.

This keeps authentication, authorization, validation, persistence, and presentation responsibilities separate.

## 7. Database Architecture

### Main entities

- `Tenant`: customer workspace and isolation boundary
- `User`: tenant member and role holder
- `Garage`: physical facility owned by a tenant
- `Floor`: level within a garage
- `Spot`: uniquely numbered bay with type and operational status
- `Vehicle`: tenant-owned vehicle identified by normalized plate
- `RatePolicy`: garage pricing rule with validity dates and daily cap
- `Ticket`: parking session from check-in to checkout
- `AuditLog`: immutable operational history

### Relationships

- one tenant has many users, garages, vehicles, tickets, rate policies, and audit logs
- one garage has many floors, spots, tickets, rate policies, and audit logs
- one floor has many spots
- one vehicle has many historical tickets
- one spot has many historical tickets
- one active ticket references one vehicle and one spot

### Database invariants

The migration creates PostgreSQL partial unique indexes:

```sql
CREATE UNIQUE INDEX "Ticket_active_garage_spot_key"
ON "Ticket"("garageId", "spotId")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "Ticket_active_tenant_vehicle_key"
ON "Ticket"("tenantId", "vehicleId")
WHERE "status" = 'ACTIVE';
```

This is important because a normal unique constraint containing `status` would incorrectly allow only one historical checkout record. The partial indexes allow unlimited history while enforcing active-state uniqueness.

## 8. Check-In Correctness

Check-in is the highest-risk workflow.

The server:

1. verifies the garage belongs to the authenticated tenant and is active
2. finds or creates the normalized vehicle record
3. rejects a vehicle with an existing active ticket
4. selects an active rate policy valid at the current time
5. selects a compatible available spot
6. conditionally changes the spot from `AVAILABLE` to `OCCUPIED`
7. creates the active ticket
8. writes a `CHECKED_IN` audit event
9. commits all operations together

The conditional spot update is checked by affected-row count. If another transaction claimed the spot first, the request fails instead of creating a double-booking.

EV vehicles use `VehicleType.EV` and can only be assigned to `SpotType.EV` spots. The assignment is performed by the server, not trusted from the frontend.

## 9. Checkout and Billing

Checkout:

1. finds an active ticket by ticket ID or normalized plate
2. calculates elapsed time using UTC timestamps
3. rounds partial hours up
4. charges the first-hour rate plus additional-hour rates
5. caps the result at `dailyCap`
6. atomically changes the ticket to `CHECKED_OUT`
7. stores checkout time, total amount, currency, and operator
8. releases the spot
9. writes a `CHECKED_OUT` audit event

The reusable calculation lives in `server/src/services/billingService.ts` so it can be tested independently from HTTP and Prisma.

Concurrent checkout is protected by a conditional ticket update that only succeeds while the ticket is still `ACTIVE`.

## 10. Authentication and Security

Implemented security practices:

- bcrypt password hashing
- short-lived JWT access tokens
- `httpOnly` access-token cookie
- `sameSite=lax` cookie policy
- secure cookies in production
- optional Bearer-token support for automation clients
- required JWT claims: user ID, tenant ID, role, and email
- tenant scoping on database reads and writes
- role-based route authorization
- CORS restricted to `CLIENT_URL`
- Express `x-powered-by` disabled
- JSON body size limit
- malformed JSON handling
- standardized 401, 403, 404, 409, and 500 responses
- production startup rejects a default JWT secret
- secrets remain in `.env`, never source control

The Neon database password must be rotated if exposed in logs, chat, screenshots, or commits.

## 11. Frontend Architecture

The frontend deliberately avoids a monolithic component.

- `app/App.tsx` owns session state, page selection, garage selection, and composition.
- `components/` contains reusable controls and shell layout.
- `pages/` contains complete product workflows.
- `lib/api.ts` is the only HTTP boundary.
- `stores/useAppStore.ts` uses Zustand for global user, garage, navigation, error, and refresh state.
- `types/app.ts` contains shared frontend domain types.
- `utils/format.ts` contains pure date and currency formatting.
- `styles/theme.css` contains central design tokens.
- `styles/index.css` contains layout and responsive presentation.

The frontend never calculates authoritative fees or decides whether a bay is valid. It submits intent and renders the server result.

Zustand was selected instead of passing session and workspace state through many component layers. It keeps cross-page state centralized without putting page-local forms, loading flags, or server business rules into a global store.

## 12. Testing and Quality Gates

### Automated server checks

```bash
cd server
npm run lint
npm test
npm run build
npx prisma validate
npm audit --omit=dev --audit-level=high
```

`npm run check` runs the TypeScript check, unit tests, production compilation, and Prisma validation.

Current unit coverage includes:

- sub-hour charging
- first-hour pricing
- partial-hour rounding
- additional-hour pricing
- daily-cap enforcement
- negative duration protection

### Automated client checks

```bash
cd client
npm run lint
npm run build
npm audit --audit-level=high
```

`npm run check` runs the frontend TypeScript check and Vite production build.

### Live smoke checks

The backend was also verified against the configured Neon database:

- health endpoint returns `200`
- protected garage route returns `401` without authentication
- unknown route returns JSON `404`
- Prisma migration status reports the database is up to date

### CI

`.github/workflows/ci.yml` runs separate server and client jobs on pushes to `main` and pull requests. Each job installs from its lockfile, runs checks, and runs dependency auditing.

## 13. Local and Production Operations

### Local backend

```bash
cd server
npm install
cp .env.example .env
npm run db:up
npm run db:migrate
npm run dev
```

### Local frontend

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

### Production backend

```bash
cd server
npm ci
npx prisma generate
npm run db:migrate
npm run build
npm start
```

Required production environment:

```env
DATABASE_URL="managed-postgresql-connection-string"
PORT=5000
JWT_SECRET="strong-random-secret"
NODE_ENV="production"
CLIENT_URL="https://your-frontend.example.com"
```

Production should additionally use managed PostgreSQL backups, secret management, TLS, centralized logs, uptime monitoring, error tracking, and a deployment rollback strategy.

## 14. Automation Keywords

These keywords describe the architecture and are useful for code-review automation, project indexing, migration tooling, CI classification, and future agents:

### Product keywords

`parking garage`, `parking management`, `garage management`, `operator console`, `attendant workflow`, `vehicle check-in`, `vehicle checkout`, `license plate lookup`, `parking availability`, `garage owner`, `multi-garage platform`

### Architecture keywords

`multi-tenant`, `tenant isolation`, `RBAC`, `role-based access control`, `server-authoritative`, `REST API`, `Express`, `Node.js`, `TypeScript`, `React`, `Vite`, `PostgreSQL`, `Prisma ORM`, `repository structure`, `service layer`, `controller layer`, `presentation layer`

### Data and correctness keywords

`transaction`, `atomic update`, `concurrency`, `double-booking prevention`, `active ticket uniqueness`, `partial unique index`, `foreign key`, `relational integrity`, `spot assignment`, `EV compatibility`, `vehicle state`, `ticket lifecycle`, `historical records`, `decimal money`, `daily cap`, `hour rounding`

### Security keywords

`JWT`, `httpOnly cookie`, `Bearer token`, `bcrypt`, `password hashing`, `CORS`, `CSRF consideration`, `input validation`, `tenant authorization`, `role authorization`, `secret management`, `secure cookie`, `audit logging`, `least privilege`, `dependency audit`

### Quality keywords

`unit test`, `integration test`, `E2E`, `smoke test`, `TypeScript strict mode`, `production build`, `Prisma validation`, `migration status`, `npm ci`, `lockfile`, `CI/CD`, `GitHub Actions`, `dependency vulnerability scan`, `health check`, `graceful shutdown`, `observability`, `rollback`

### Automation action keywords

`install dependencies`, `generate Prisma client`, `apply migrations`, `validate schema`, `run lint`, `run tests`, `build server`, `build client`, `audit dependencies`, `start backend`, `start frontend`, `check health endpoint`, `verify authentication`, `verify database connection`, `verify migration status`, `deploy`, `rollback`, `monitor`, `backup`

## 15. Known Boundaries and Future Work

The current implementation is production-oriented but not a replacement for operational infrastructure. Before a high-volume launch, add:

- full HTTP integration tests with an isolated PostgreSQL database
- Playwright browser E2E tests for registration, setup, check-in, and checkout
- rate limiting for authentication endpoints
- CSRF protection if cross-site cookie scenarios require it
- refresh-token rotation or session management
- structured logging with request IDs
- metrics and tracing
- payment-provider integration and reconciliation
- timezone-aware reporting per garage
- Redis or another real-time layer if live occupancy fan-out becomes necessary
- backup restoration drills
- load and concurrency testing against realistic traffic

These are follow-on production hardening steps, not reasons to move business rules into the frontend or remove the current database constraints.

## Final Principle

The platform was built from the most failure-sensitive rule outward:

> A parking state transition is valid only when the server, transaction, and database agree on it.

Everything else, including the dashboard, reports, styling, and automation, is organized around making that rule dependable, observable, and maintainable.

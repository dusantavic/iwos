# Iwos — Workforce Scheduling & Absence Management

<img width="1682" height="742" alt="3" src="https://github.com/user-attachments/assets/b4c60380-2ac2-4cc1-851f-178908531a87" />

A multi-tenant SaaS platform for shift-based organisations (manufacturing plants,
clinics, logistics). It generates legally compliant shift schedules with a
constraint solver, tracks absences against statutory leave balances, and gives
employees a self-service portal for requests and shift swaps.

**Stack:** ASP.NET Core 10 · PostgreSQL 18 · EF Core · Google OR-Tools (CP-SAT) · React 19 · Vite · Tailwind CSS 4

<img width="1677" height="740" alt="1" src="https://github.com/user-attachments/assets/9f6f6c1e-19e3-47d8-bea2-8209266a5aab" />

---

## Why this project is interesting

The core problem is a constrained optimisation one. Given a month, a set of
employees with individual contracts, rotation patterns, qualifications and
approved absences, produce an assignment of people to shifts that:

- never violates a **hard constraint** (minimum rest period between shifts,
  maximum consecutive working days, contractual weekly hours, qualification
  requirements), evaluated over a sliding ±7-day window so the boundaries
  between generated months stay legal;
- gets as close as possible to the **soft objectives** (fair distribution of
  unpopular shifts, respecting stated preferences, minimising coverage gaps).

<img width="1690" height="745" alt="5" src="https://github.com/user-attachments/assets/fc0722a3-716a-4f3c-9279-659513896d64" />


`Backend/Business/Scheduling` implements this as a two-phase pipeline: a
greedy constructive pass builds a feasible seed schedule, then either a
[CP-SAT](https://developers.google.com/optimization/cp/cp_solver) model
(`Optimizer/CpSatScheduleOptimizer.cs`) or a local-search optimiser
(`Optimizer/ScheduleLocalSearchOptimizer.cs`) improves it under a time budget.
Constraints are pluggable (`Constraints/IScheduleConstraint.cs`) so a new
labour-law rule is a single class, not a rewrite.

<img width="1676" height="738" alt="2" src="https://github.com/user-attachments/assets/85ba0c82-5e79-43e2-8854-e45750f0533c" />

---

## Architecture

```
┌──────────────┐    HTTPS     ┌─────────┐   /api/v1/*   ┌───────────────┐
│  React SPA   │ ───────────► │  Caddy  │ ────────────► │  ASP.NET Core │
│  (nginx)     │              │  (TLS)  │   /uploads/*  │      API      │
└──────────────┘              └─────────┘               └───────┬───────┘
                                                                │ EF Core
                                                        ┌───────▼───────┐
                                                        │  PostgreSQL   │
                                                        │ (schema: hrs) │
                                                        └───────────────┘
```

### Backend (`Backend/`)

| Layer | Responsibility |
|---|---|
| `Controllers/` | Thin HTTP layer, API versioning, rate limiting |
| `Business/Services/` | Domain logic — absences, shifts, capacity, dashboards |
| `Business/Scheduling/` | Constraint model + CP-SAT / local-search optimisers |
| `Infrastructure/Repositories/` | Data access, query composition |
| `Data/` | EF Core model, configuration, migrations |
| `Common/` | DTOs, contracts, configuration binding |
| `Bootstrap/` | Autofac modules, DI & logging composition |

Cross-cutting: Autofac for DI, Serilog → PostgreSQL sink with a retention job,
Quartz for scheduled work (yearly leave-balance provisioning, log retention),
DistributedLock.Postgres so jobs stay single-run across replicas, health checks
at `/healthz`.

**Three isolated authentication domains**, each with its own JWT audience and
authorisation policy — manager app, employee portal, and platform admin portal.
Tenant isolation is enforced at the `DbContext` level via a tenant provider, so a
query cannot accidentally cross tenants.

### Frontend (`Frontend/`)

React 19 + Vite, no TypeScript, no global state library — state is local to
components, navigation state lives in the URL. Two fully separated auth domains
(manager and employee portal) with independent token stores and axios instances.

<img width="1682" height="746" alt="4" src="https://github.com/user-attachments/assets/5808d29c-869f-4fb9-a8ed-91b22b8b9117" />


---

## Running it

### Option A — Docker (nothing to install but Docker)

```bash
git clone <repo-url> && cd iwos
docker compose up --build
```

- SPA → http://localhost:5173
- API → http://localhost:8080 (`/healthz` for status)
- PostgreSQL → localhost:5432 (`postgres` / `postgres`)

Migrations are applied automatically on API startup.

### Option B — Local toolchain

Requires .NET 10 SDK, Node 20+, PostgreSQL 18.

```bash
# 1. Configure local secrets
cp Backend/appsettings.Development.example.json Backend/appsettings.Development.json
#    then edit the connection string and JWT key
#    (or use: dotnet user-secrets --project Backend set "ConnectionStrings:Db" "...")

# 2. API — http://localhost:5097, API reference at /scalar
dotnet run --project Backend

# 3. SPA — http://localhost:5173
cd Frontend && npm install && npm run dev
```

### Seeding a demo tenant

The repository ships with no customer data. To get a realistic environment —
a manufacturing plant with departments, positions, rotation patterns and
350 employees:

```bash
dotnet run --project Tools/SeedMockTenant           # or: -- 500  for more employees
```

Then sign in to the manager app:

| Role | Username | Password |
|---|---|---|
| Client admin | `plant.admin` | `Demo#Plant2026!` |
| Platform admin (`/admin`) | `admin` | `ChangeMe123!` |

> The platform admin account is seeded by migration as a bootstrap credential.
> **Change it immediately on any deployment that is reachable from the internet.**

### Tests

```bash
dotnet test Backend/Iwos.sln
```

The suite concentrates on the scheduling engine — constraint satisfaction,
rest-period edge cases, month-boundary continuity, onboarding mid-rotation,
and CP-SAT optimiser behaviour.

---

## Configuration

No secret is ever committed. Configuration is layered:
`appsettings.json` → `appsettings.Development.json` (gitignored) → environment
variables → user secrets.

| Setting | Environment variable |
|---|---|
| Database connection | `ConnectionStrings__Db` |
| JWT signing key (32+ chars) | `APPLICATION__JWTSETTINGS__JWTSECRETKEY` |
| SMTP sender | `EMAILNOTIFICATIONSETTINGS__EMAILNOTIFICATIONADDRESS` |
| SMTP password | `EMAILNOTIFICATIONSETTINGS__EMAILNOTIFICATIONADDRESSPASSWORD` |

The API **fails fast at startup** if the JWT key is missing or shorter than 32
characters, rather than silently issuing tokens that never validate.

### Production deployment

```bash
cp .env.example .env    # fill in real values
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` differs from the dev compose in ways that matter:
Postgres and the API are on a private network with no published ports, Caddy is
the only public surface and terminates TLS with automatic Let's Encrypt
certificates, uploads live on a named volume outside the container filesystem,
and every secret comes from `.env`.

---

## Repository layout

```
Backend/             ASP.NET Core API (Iwos.sln lives here)
Frontend/            React SPA
Iwos.Tests/          xUnit tests, scheduling-engine focused
Tools/SeedMockTenant Demo data generator
docker-compose.yml   Local development stack
docker-compose.prod.yml + Caddyfile   Production stack
```

---

<img width="1686" height="743" alt="7" src="https://github.com/user-attachments/assets/b952cc68-0a42-4774-9881-22be012159f4" />


## License

[MIT](LICENSE)

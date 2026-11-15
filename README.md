# CivicOps — Smart Apartment Community Operations Platform

**CivicOps** is a full-stack smart residential community operations and governance platform for **Green Valley Residency**. It combines role-based apartment helpdesk resolution, work-order execution, gatehouse visitor/parcel security, preventive asset maintenance, recurrence intelligence, and community governance into a single JWT-secured application backed by PostgreSQL.

---

## 1. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Axios
- **Backend**: Java 17, Spring Boot 3.2.4, Spring Security (JWT + BCrypt), Spring Data JPA / Hibernate
- **Database & Migrations**: PostgreSQL 15, Flyway (`V1`–`V5`)
- **Local Dev & Deployment**: Windows 11 PowerShell scripts, VS Code tasks, Docker Compose (Postgres), Netlify-ready SPA config (`netlify.toml`)

---

## 2. Core Modules & Security Architecture

### Authentication & Unit Claim Verification
- **Login-First Security**: Unauthenticated visitors land on the Login page (`POST /api/v1/auth/login`). Tokens are validated server-side against PostgreSQL with BCrypt hashes and stored per-session in `sessionStorage` with `jti` revocation on logout.
- **Authorized Role Selection**: Multi-role staff accounts (e.g., Admin + Management) choose their active session scope after login via `/api/v1/auth/switch-role`.
- **Unit Claim Verification**: Public registration (`POST /api/v1/auth/register`) creates `RESIDENT` accounts with `unitVerificationStatus = PENDING_VERIFICATION`. Unverified residents cannot view another apartment's unit details, visitor passes, parcels, or dues until Estate Management or Admin verifies their unit claim (`POST /api/v1/users/{id}/verify-unit`).

### 9-Step Complaint & Resolution Governance
1. **Submit (`RESIDENT` / `MANAGEMENT` / `ADMIN`)**: Logs ticket + automatic SLA deadline + recurrence warning.
2. **Triage Review (`MANAGEMENT` / `ADMIN`)**: Reviews and prioritizes ticket.
3. **Assign Technician (`MANAGEMENT` / `ADMIN`)**: Links a `MAINTENANCE` user and generates a Work Order.
4. **Inspect & Diagnose (`MAINTENANCE`)**: Records diagnostic notes and evidence.
5. **Spares Logging & Requisitions**: Tracks inventory usage and approvals.
6. **Resolution Proposal (`MAINTENANCE`)**: Technicians propose a fix — they cannot self-close complaints.
7. **Management Verification Gate (`MANAGEMENT` / `ADMIN`)**: Approves or returns proposals for rework.
8. **Resident Sign-off or Dispute (`RESIDENT` owner)**: Exclusive digital sign-off (1–5 rating) or dispute escalation.
9. **Closed & Archived**: Updates asset metrics and Community Memory Graph.

### Additional Operational Modules
- **Gatehouse & Visitor Lifecycle**: Pre-approved 6-digit PINs, QR/PIN verification (`SECURITY`), walk-in registration, visitor check-out with overstay calculation, and pass revocation (`RESIDENT` for own verified unit, `SECURITY`, `MANAGEMENT`, `ADMIN`).
- **Parcel & Smart Locker Hub**: Gate intake with generated 6-digit pickup OTP and verified unit collection.
- **Preventive Maintenance & Asset Register**: Scheduled PM cycles, overdue sync, PM work-order generation, and inventory reorder/movements.
- **Community Memory Graph, Reliability Radar & Recurrence Queue**: Deterministic graph and scoring derived strictly from PostgreSQL tickets, work orders, assets, and PM schedules.
- **Community Hub, Notifications & Audit Ledger**: Announcements, RSVP events, visibility-scoped documents, role/user notifications, and CSV-exportable security audit logs.

---

## 3. Honest Demo / Simulation Scope

- **Dues Ledger Settlement**: There is no live external payment gateway (UPI/Razorpay/Stripe) integrated. Recording a dues payment records a **Manual / Demo Ledger Entry** (`LEDGER-...`) in PostgreSQL and zeroes the unit's outstanding ledger balance.
- **SOS Emergency Alerts**: Triggering SOS creates an `IncidentAlert` record, writes in-app notifications to `SECURITY` and `MANAGEMENT`, and computes affected unit count from PostgreSQL (`unitRepository.count()`). No external SMS/telecom gateway is integrated.

---

## 4. Quick Start on Windows 11 & VS Code

### Prerequisites
- Node.js 20+ & npm
- Java JDK 17 (`JAVA_HOME` configured)
- Apache Maven 3.8+
- Docker Desktop (for local PostgreSQL 15) or local PostgreSQL on port `5432`

### One-Command Launch (PowerShell)
```powershell
.\scripts\check-environment.ps1
.\scripts\start-local.ps1
```
Stop all local processes cleanly (while preserving PostgreSQL volumes):
```powershell
.\scripts\stop-local.ps1
```
Run full verification checks (lint, unit tests, production build, Maven tests):
```powershell
.\scripts\verify-local.ps1
```

### VS Code Tasks
Open the repository in VS Code (`code .`) and run **Terminal > Run Task**:
- **CivicOps: Start Full Local Stack** (default build task `Ctrl+Shift+B`)
- **CivicOps: Stop Local Stack (Preserve DB)**
- **CivicOps: Verify Full Stack (Lint + Tests + Build)**

### Local URLs
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8080/api/v1`
- **Actuator Health**: `http://localhost:8080/api/v1/actuator/health`
- **PostgreSQL**: `localhost:5432` (`civicops_db`)

---

## 5. Seeded Development Accounts

All seeded users in Flyway `V2__seed_demo_data.sql` use password **`Password@123`**:

| Role | Email | Notes |
| --- | --- | --- |
| `ADMIN` / `MANAGEMENT` | `vikram.admin@civicops.in` | Multi-role account (triggers role selector) |
| `MANAGEMENT` | `suresh.patel@civicops.in` | Estate Manager |
| `RESIDENT` | `rahul.sharma@greenvalley.in` | Verified Unit `B-402` (`Tower B`) |
| `MAINTENANCE` | `ramesh.kumar@civicops.in` | Senior Facility Technician |
| `SECURITY` | `arjun.singh@civicops.in` | Head Gatehouse Officer |

For detailed setup and cloud deployment steps, see [`LOCAL_SETUP.md`](./LOCAL_SETUP.md) and [`DEPLOYMENT.md`](./DEPLOYMENT.md).

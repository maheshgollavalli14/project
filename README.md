# CODEBREAK

> **BREAK THE CODE WITHIN YOU**  
> *Compete. Collaborate. Code. Conquer.*

CODEBREAK is a production-ready, full-stack college programming contest platform architected for high-concurrency competitive coding championships. It natively supports both **individual participants** and **2-member collaborative teams** across a three-round progressive elimination tournament.

---

## ⚡ Architectural Highlights

* **Real-time 2-Member Team Collaboration**: Server-side problem locking via Socket.IO and atomic database transactions. While Teammate A edits a question, it is locked for Teammate B with live heartbeat tracking and a 45-second auto-expiration safeguard.
* **Authoritative Server-side Timers**: Contest rounds and countdowns are authoritative on the backend. When a round finishes, all submission ingestion and problem locks are instantaneously cut off.
* **Isolated Subprocess Code Execution Sandbox**: Participant code (Python 3.13, Java 26) runs in isolated execution sandboxes with memory and runtime caps, sanitized input/output pipelines, and strict separation between public sample testcases and private scoring testcases.
* **Proctoring & Anti-Cheat Engine**: Real-time browser event listeners detect fullscreen escapes, window focus losses, and tab switches, auditing each incident into an admin security log with proctor notes and review workflows.
* **Automated Qualification Engine**: Evaluates cumulative points, solved test suites, and penalty seconds across Round 1 & Round 2 to promote the Top $N$ participants/teams into the Round 3 Workstation.
* **Full Administration Portal**: Complete director capabilities to manage participants, teams, problem statements, real-time submission logs, round timings, contest settings, and security audits.

---

## 🏛️ System Architecture

```
                                 ┌─────────────────────────────────┐
                                 │   Vite + React 18 + TS Client   │
                                 │ (Tailwind CSS, Monaco, Lucide)  │
                                 └───────────────┬─────────────────┘
                                                 │ HTTP / WebSocket
                                                 ▼
                                 ┌─────────────────────────────────┐
                                 │   Express + Socket.IO Backend   │
                                 │   Authoritative Timers & Locks  │
                                 └───────┬─────────────────┬───────┘
                                         │                 │
                        Prisma ORM Queries                 Subprocess Sandbox
                                         │                 │
                                         ▼                 ▼
                        ┌──────────────────┐   ┌─────────────────────────────┐
                        │    PostgreSQL    │   │  Ephemeral Sandbox Runner   │
                        │ Database Cluster │   │ (Python 3.13, Java 26, gcc) │
                        └──────────────────┘   └─────────────────────────────┘
```

---

## 🏆 Contest Structure

### Round 1: Foundation Sprint (45 Minutes)
* **Format**: Multiple Choice Questions (MCQs), Output Prediction challenges, and Speed Algorithmic Coding.
* **Evaluation**: Instant automated verification for MCQs and unit-test evaluation for coding problems.
* **Features**: Question navigator grid, review flags, and real-time saved state.

### Round 2: Code Reconstruction & Debugging (60 Minutes)
* **Format**:
  * *Jumbled Code Fragments*: Participants reassemble shuffled blocks into an optimal algorithmic flow.
  * *Bug Extermination*: Broken code containing subtle off-by-one errors and edge cases to identify and patch.
* **Features**: Drag-and-drop sequencing, diff viewer, and instant compiler diagnostics.

### Round 3: Grand Finale — The Codebreak Workstation (90 Minutes)
* **Format**: Advanced competitive programming algorithmic challenges.
* **Interface**: 3-pane professional workstation:
  1. *Left Pane*: Problem statement, input/output formats, constraints, and sample cases.
  2. *Center Pane*: Monaco code editor with syntax highlighting, autocomplete, and language selector.
  3. *Right Pane*: Interactive Testcase runner (custom inputs, sample vs. hidden suite evaluation, memory and runtime metrics).

---

## 🔑 Seeded Roles & Test Credentials

The database is pre-seeded with realistic participants, 2-member teams, 3 full rounds of questions, and admin director access:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Director / Admin** | `admin@codebreak.dev` | `Admin@CodeBreak2026` | Full administrative control, settings, question authoring, qualification |
| **Solo Participant** | `alex.chen@mit.edu` | `Password@123` | Individual competitor track |
| **Team Member 1** | `rohan.gupta@nitt.edu` | `Password@123` | Team: **ByteForce** (Leader) |
| **Team Member 2** | `ananya.deshmukh@nitt.edu` | `Password@123` | Team: **ByteForce** (Member) |
| **Team Member 3** | `dev.kapoor@pilani.bits-pilani.ac.in` | `Password@123` | Team: **Algorithmic Architects** |

---

## 🚀 Local Development Setup

### Prerequisites
* **Node.js**: v18+ (v20 or v22 recommended)
* **PostgreSQL**: Local service or cluster
* **Python**: 3.10+ (for Python runner sandbox)
* **Java**: JDK 17+ (optional, for Java runner sandbox)

### 1. Database Initialization
A dedicated PostgreSQL cluster can be started on port `5433`:
```powershell
# Start local PostgreSQL cluster
& "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -D "c:\event\pgdata"
```

### 2. Backend Setup
```bash
cd server
npm install

# Push Prisma schema and seed database
npx prisma db push
npm run prisma:seed

# Launch backend in development mode
npm run dev
```
Backend API will listen on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd client
npm install

# Launch frontend in development mode
npm run dev
```
Frontend Web App will listen on `http://localhost:5173`.

---

## 🧪 Automated Testing Suite

The platform includes a comprehensive integration test suite verifying authentication, RBAC authorization, problem locking concurrency, isolated code execution, anti-cheat violation auditing, and qualification engine:

```bash
# Run server test suite
npm --prefix server test

# Verify client production build
npm --prefix client run build
```

Both build and integration tests execute with **100% pass rate** (15/15 tests passing).

---

## 📡 API Endpoint Reference

### Authentication (`/api/auth`)
* `POST /api/auth/register` — 5-step registration wizard (Solo & 2-member teams).
* `POST /api/auth/login` — Issues HTTP-only JWT and session payload.
* `GET /api/auth/me` — Fetches current user profile and team details.
* `POST /api/auth/logout` — Revokes session cookie.

### Contest & Problems (`/api/contests`, `/api/rounds`)
* `GET /api/contests/current` — Active championship details and round schedules.
* `GET /api/rounds/:id` — Round details and questions (with sample testcases).

### Submissions & Execution (`/api`)
* `POST /api/questions/:id/run` — Isolated run against public sample cases.
* `POST /api/questions/:id/submit` — Official evaluation against hidden test suites.
* `GET /api/submissions` — Participant's submission history.

### Team Collaboration & Problem Locking (`/api/team`)
* `GET /api/team` — Team profile and active locks.
* `POST /api/team/problem-lock` — Acquires exclusive lock on a problem statement.
* `DELETE /api/team/problem-lock` — Releases active problem lock.
* `POST /api/team/heartbeat` — Refreshes lock expiration window (45s).

### Integrity & Proctoring (`/api/violations`)
* `POST /api/violations` — Audits anti-cheat triggers (`TAB_SWITCH`, `FULLSCREEN_EXIT`, etc.).

### Admin Portal (`/api/admin`)
* `GET /api/admin/dashboard` — Live metrics (users, teams, submissions, revenue).
* `GET /api/admin/participants` — Participant roster with search and filter.
* `GET /api/admin/teams` — Team list with active problem locks.
* `GET /api/admin/questions` — Full problem statements with hidden testcases.
* `POST /api/admin/questions` — Question authoring interface.
* `GET /api/admin/submissions` — Real-time execution stream across all teams.
* `POST /api/admin/contest/start-round` — Opens contest round with server countdown.
* `POST /api/admin/contest/end-round` — Manually closes round and releases locks.
* `POST /api/admin/qualification/calculate` — Runs qualification engine for Top $N$.
* `GET /api/admin/violations` — Proctor incident audit stream.
* `PATCH /api/admin/violations/:id` — Reviews and records administrative notes.
* `GET /api/admin/settings` & `PATCH /api/admin/settings` — Contest configuration toggles.

---

## 🐳 Production Deployment with Docker Compose

Deploy the entire stack (PostgreSQL, Backend Node.js API, and Nginx Frontend) with a single command:

```bash
docker-compose up -d --build
```

The application will be accessible at:
* **Frontend Application**: `http://localhost` (Port 80)
* **Backend API**: `http://localhost:5000`
* **PostgreSQL Database**: `localhost:5432`

---

## 🛡️ License & Copyright
Developed for **CODEBREAK 2026**. All rights reserved.

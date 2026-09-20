# JARVIS — EXECUTION ROADMAP & PHASED BUILD PLAN

**Derived from:** `anubhav-work/01-to-do.md` (the JARVIS spec)
**Date:** 2026-08-21
**Status:** Planning document — not implementation

---

## 1. Purpose

This document turns the JARVIS spec into a concrete, ordered, actionable build plan. It defines:

- The current verified state of the repository
- The target architecture and repository structure
- The locked technology stack
- The event-driven, provider-agnostic, safety-first design patterns
- The full phased execution plan (Phase 0 → 16) with acceptance criteria
- The immediate next actions for **Phase 0 — Foundation**

It is the single source of truth for *how* and *in what order* to build JARVIS.

---

## 2. Product Summary

JARVIS is a **Personal AI Operating System for Windows** — a local-first AI layer over the user's daily work, tasks, knowledge, schedule, applications, and computer.

**Target machine (verified in spec):**

| Component | Value |
|---|---|
| CPU | Intel Core i9-14900K |
| RAM | 32 GB |
| GPU | None (Intel UHD Graphics 770 only) |
| Storage | ~1.86 TB |
| OS | Windows 11 Home 24H2 (x64) |

**Hard constraints:**

- No dedicated GPU → **no CUDA, no continuously-running local LLM**
- Initial AI provider: **Google Gemini API** (key lives only on the backend)
- Local LLM (Ollama) support must be possible **later** without rewriting the app
- Background services must stay lightweight for **~14 hours/day** operation
- Every AI-driven action on the computer goes through a **permission system**

---

## 3. Current State Assessment (verified)

| Area | Status | Notes |
|---|---|---|
| Next.js app | ✅ Exists | Fresh `create-next-app` boilerplate (Next 16.3.1, React 19.2.8, TS 5, Tailwind v4) at repo root |
| Backend API | ❌ Missing | No FastAPI, no Python service |
| Database | ❌ Missing | No PostgreSQL, no migrations |
| Cache / jobs | ❌ Missing | No Redis |
| Desktop shell | ❌ Missing | No Tauri |
| Tests | ❌ Missing | No backend or frontend test suites |
| Docker | ❌ Missing | No docker-compose, no Dockerfiles |
| Env config | ❌ Missing | No `.env.example` |
| Docs | ⚠️ Partial | Only `01-to-do.md` (spec) and this roadmap |

**Conclusion:** The project is at a true Phase 0 starting line. The existing Next.js app is the future frontend shell and should be preserved/repurposed, not thrown away.

---

## 4. Guiding Architectural Principles

1. **Golden rule — provider abstraction.** Business logic NEVER touches Gemini SDK objects. All AI goes through `AIService → AIProvider interface → GeminiProvider → SDK`.
2. **No GPU dependency.** Everything must work on integrated graphics. Local LLM is opt-in, later.
3. **LLM never controls the OS directly.** Tool selection → permission check → tool execution → result. The LLM can propose; the permission system disposes.
4. **No unrestricted shell execution.** No `execute_any_command`. Allowlists + risk classification + confirmation + audit logging.
5. **Event-driven background design.** Deterministic rules first; AI only invoked when reasoning genuinely helps. The background must *wait*, not poll an LLM.
6. **Incremental phases with hard STOP points.** One phase at a time. No scope creep into future phases.
7. **No fake functionality.** The UI must never claim a backend operation succeeded when it didn't. Mock data only in clearly-marked dev contexts.
8. **Usefulness over features.** Every feature must answer "Will this actually make the user's day easier?"
9. **Keep it simple.** Prefer deterministic services. Avoid LangChain/LangGraph unless agent orchestration truly needs it. No unnecessary microservices.

---

## 5. Target Architecture

```
┌──────────────────────────────┐
│       JARVIS (Tauri)         │   Phase 6+ (desktop shell)
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│       Next.js UI (web)       │   apps/web
└──────────────┬───────────────┘
               │ HTTP / SSE
┌──────────────▼───────────────┐
│      FastAPI API layer       │   services/api
└──────┬──────────┬────────┬───┘
       │          │        │
       ▼          ▼        ▼
 AI Orchestrator  Memory   Tool System
       │          │        │
       ▼          ▼        ▼
   AIService    Postgres   Windows / Browser / Files / Apps
       │        + pgvector
       ▼
  Provider Router
   ┌────┴────┐
   ▼         ▼
 Gemini    Ollama
(initial)  (future)
```

Supporting infrastructure: **Redis** (cache, jobs, queues, rate limits) and a **worker + scheduler** process for background/event-driven work.

---

## 6. Repository Structure (recommended)

Adapt the spec's monorepo to the existing repo root. The current Next.js app moves into `apps/web` (trivial for boilerplate). No workspace tooling is required between frontend and backend — they have independent dependency trees (npm/pnpm vs. pip/uv).

```
next-gen-jarvis-ai/
├── apps/
│   └── web/                  # Next.js UI (moved from repo root)
├── services/
│   ├── api/                  # FastAPI backend (Phase 0)
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── core/         # config, logging, security, providers
│   │   │   ├── models/       # SQLAlchemy models
│   │   │   ├── schemas/      # Pydantic schemas
│   │   │   ├── repositories/ # data access
│   │   │   ├── services/     # business logic
│   │   │   ├── ai/           # AIProvider interface + GeminiProvider
│   │   │   ├── tools/        # tool registry + permission system
│   │   │   ├── memory/       # structured + semantic memory
│   │   │   └── api/          # routers (/api/v1/...)
│   │   └── tests/
│   ├── worker/               # background event worker (Phase 3+)
│   └── scheduler/            # scheduled jobs (Phase 3+)
├── infrastructure/
│   ├── postgres/             # init scripts
│   ├── redis/
│   └── docker-compose.yml
├── docs/
│   ├── architecture/
│   ├── api/
│   └── decisions/
├── scripts/
├── .env.example
├── .gitignore
└── README.md
```

**Note:** `packages/shared-types` and `packages/ui` are optional; add only when a real sharing need appears (e.g., API response types consumed by both web and desktop).

---

## 7. Technology Stack (locked)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS | Already in repo; modern, typed |
| UI components | shadcn/ui | Accessible, copy-in, no lock-in |
| Animation | Framer Motion | Prem. UI phase (Phase 15) |
| Data fetching | TanStack Query | Cache + server state where useful |
| Backend | Python + FastAPI | Async, typed via Pydantic, clean OpenAPI |
| ORM / migrations | SQLAlchemy + Alembic | Mature, migration-first |
| Agents | No LangChain/LangGraph by default | Keep deterministic; add only if needed (Phase 13) |
| Database | PostgreSQL + pgvector | Structured data + semantic embeddings |
| Cache / jobs | Redis | Cache, queues, rate limits, temp state |
| Desktop | Tauri | Lightweight, Rust shell over web UI (Phase 6+) |
| Browser automation | Playwright | PC tools (Phase 7+) |
| AI | Gemini API first; Ollama later | No GPU; provider abstraction |
| Voice | STTProvider / TTSProvider interfaces | Provider-independent from day 1 (Phase 5) |
| Test (py) | pytest | Unit, integration, API tests |
| Test (web) | Vitest + React Testing Library | Component + critical-flow tests |

---

## 8. Environment Configuration

Create `.env.example` at repo root (and copy into `services/api`):

```ini
APP_ENV=development

# PostgreSQL
DATABASE_URL=postgresql+asyncpg://jarvis:jarvis@localhost:5432/jarvis

# Redis
REDIS_URL=redis://localhost:6379/0

# AI Provider
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash        # confirm current model at implementation time
GEMINI_EMBEDDING_MODEL=text-embedding-004   # confirm at implementation time

# Optional future
OLLAMA_BASE_URL=
OLLAMA_MODEL=

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Rules:
- Secrets never committed; `.env` is gitignored.
- API key only read server-side in `services/api`.
- Never log secrets; redact in error paths.

---

## 9. Infrastructure

`infrastructure/docker-compose.yml`:

- **postgres**: `pgvector/pgvector` image, port 5432, named volume, healthcheck
- **redis**: `redis:7-alpine`, port 6379, healthcheck
- App components (web, API) run **natively** during early development — Docker-izing them is optional and should be deferred until it simplifies rather than complicates local dev.

---

## 10. Core Domain Model (Phase-appropriate)

Create tables only when a phase needs them. Initial priority:

| Phase | Tables |
|---|---|
| 0 | (none required — health only) |
| 1 | `conversations`, `messages` |
| 2 | `tasks`, `task_dependencies` |
| 3 | `memories` (+ pgvector), `notes` |
| 4 | `goals`, `projects`, `focus_sessions`, `daily_reviews` |
| 6+ | `tool_executions`, `permissions`, `notifications` |
| 8+ | `calendar_events`, `reminders` |

Delay: `users`/`profiles`/auth can be minimal (local single-user) — a `user` settings table rather than full multi-user auth in early phases. Revisit at Phase 16 (production hardening).

---

## 11. API Versioning & Endpoint Map

All endpoints under `/api/v1/`. Consistent error structure and Pydantic validation everywhere.

Early set:

```
GET   /api/v1/health
POST  /api/v1/chat                    # Phase 1 (stream via SSE)
GET   /api/v1/conversations
GET   /api/v1/conversations/{id}
GET   /api/v1/conversations/{id}/messages

POST  /api/v1/tasks                   # Phase 2
GET   /api/v1/tasks
GET   /api/v1/tasks/{id}
PATCH /api/v1/tasks/{id}
POST  /api/v1/tasks/{id}/complete
DELETE /api/v1/tasks/{id}

POST  /api/v1/memory                  # Phase 3
GET   /api/v1/memory/search
DELETE /api/v1/memory/{id}

GET   /api/v1/productivity/next-action  # Phase 4
```

Later: `/calendar/...`, `/email/...`, `/knowledge/...`, `/system/...`, `/focus/...`, `/notifications/...`.

---

## 12. AI Provider Abstraction (Golden Rule)

```
Task/Productivity/Any service
            ↓
        AIService          ← the ONLY entry point the rest of JARVIS knows
            ↓
     AIProvider (Protocol/ABC)
            ↓
     GeminiProvider         ← implements interface
            ↓
       Gemini SDK
```

**Provider-independent models** (defined once, used everywhere):

```
AIRequest, AIResponse, AIMessage, AIToolCall,
AIToolResult, AIUsage, AIError
```

**AIProvider capabilities (interface):**

```
generate()
stream()
generate_structured()      # schema-constrained output
generate_with_tools()       # function calling
embed()                     # for memory/RAG phases
```

Switching `AI_PROVIDER` from `gemini` to `ollama` must require zero changes outside the provider layer and config.

---

## 13. Tool & Permission System Design

**Flow (immutable):**

```
User → JARVIS → LLM → Tool Selection → Permission Check → Tool Execution → Result → LLM → User
```

**Tool registration metadata:**

```
tool_name, description, parameters (JSON Schema),
risk_level, requires_confirmation
```

**Risk levels:**

| Level | Examples | Policy |
|---|---|---|
| SAFE | `list_tasks`, `search_memory` | Auto-run |
| LOW | `create_task`, `open_url`, `open_application` | Auto-run, logged |
| MEDIUM | `read_file`, `search_files` | Auto-run, logged, path-sandboxed |
| HIGH | `modify_file`, `send_email` | Requires confirmation |
| CRITICAL | `delete_file` | Requires explicit confirmation + audit trail |

**Shell safety:** no `execute_any_command`. Any future shell capability = allowlist of specific commands + risk classification + confirmation + audit logging.

**Validation:** LLM-generated tool arguments are never trusted blindly — validate against JSON Schema before execution.

---

## 14. Memory Design

Two systems, both in PostgreSQL:

- **Structured memory** — normal SQL tables: tasks, goals, projects, preferences, reminders, calendar, settings.
- **Semantic memory** — `memories`/`notes` tables + `pgvector` embedding column for conversations, notes, documents, project knowledge.

Rules:
- Do NOT store everything as embeddings. SQL for structured; vectors for meaning.
- Retrieval = hybrid (keyword + vector) when useful (Phase 10+).
- `remember` / `search_memory` / `delete_memory` tools (Phase 3).

---

## 15. Phased Execution Plan (State: Phase 0 pending)

### PHASE 0 — FOUNDATION

**Goal:** Working skeleton — frontend, backend, Postgres, Redis, health, logging, tests, docs.

**Deliverables:**
1. Restructure repo → `apps/web` + `services/api` + `infrastructure/` + `docs/` + `scripts/`
2. FastAPI app with `/api/v1/health` returning `{ status, version, provider_configured }`
3. PostgreSQL + Redis via docker-compose with healthchecks
4. SQLAlchemy engine + Alembic initialized (no speculative tables yet)
5. `.env.example`, structured logging (request_id, operation, duration, status)
6. pytest suite (health endpoint, config), linters (ruff), type checks (mypy/pyright)
7. Next.js converted from boilerplate → minimal JARVIS shell that fetches `/health` and displays backend status
8. README + `docs/architecture/` initial ADRs

**Acceptance:**
```
Frontend starts ✅   Backend starts ✅   Postgres works ✅   Redis works ✅
Health endpoint works ✅   Frontend talks to backend ✅
Tests run ✅   Lint passes ✅   Type check passes ✅   Build succeeds ✅
```
**STOP — do not begin Phase 1.**

---

### PHASE 1 — GEMINI JARVIS CHAT

**Goal:** Real Gemini-powered chat with streaming and persistence.

**Deliverables:**
- `AIProvider` interface + `AIService` + `GeminiProvider` (SDK isolated)
- Gemini config via env; retry/timeout/error normalization; usage tracking
- `conversations` + `messages` tables (Alembic migration)
- `POST /api/v1/chat` with SSE streaming; conversation history endpoints
- Chat UI: message list, input, streaming response, conversation sidebar
- Mock-provider tests, tool-selection tests, API tests

**User flow:** Open JARVIS → create conversation → ask → Gemini responds (streamed) → persists → reopen later.

**STOP.**

---

### PHASE 2 — TASK MANAGEMENT

**Goal:** Tasks via natural language with real persistence.

**Deliverables:**
- Task CRUD tools: `create_task`, `list_tasks`, `get_task`, `update_task`, `complete_task`, `delete_task`
- `tasks` table + `tasks/{id}/complete` endpoint
- Task UI (list, create, complete, filter)
- NL commands: *"Create a task to finish my RAG implementation tomorrow."* → JARVIS calls `create_task` and the task is actually saved
- Permission handling for task tools (SAFE/LOW)

**STOP.**

---

### PHASE 3 — MEMORY

**Goal:** Remember and recall.

**Deliverables:**
- `remember`, `search_memory`, `delete_memory` tools
- Structured (SQL) + semantic (pgvector) memory
- `POST /api/v1/memory`, `GET /api/v1/memory/search`
- Flow: *"Remember that my deployment is blocked by access."* → later *"What is blocking my deployment?"* → JARVIS retrieves it

**STOP.**

---

### PHASE 4 — PRODUCTIVITY ENGINE

**Goal:** Prioritization and the core "What should I do now?"

**Deliverables:**
- Goals, projects, task priorities, due dates
- `GET /api/v1/productivity/next-action` — evaluates time, tasks, priorities, deadlines, calendar, effort, focus state; returns **one** strong recommendation + short reason
- Daily planning flow; focus sessions (`start_focus_session`, `end_focus_session`)
- Use real user data — no canned recommendations

**STOP.**

---

### PHASE 5 — VOICE

**Goal:** Push-to-talk interaction (no wake word yet).

**Deliverables:**
- `STTProvider` / `TTSProvider` interfaces (provider-independent)
- Push-to-talk, listening/thinking/speaking states, interruption, mute
- Voice round-trip: speak → STT → chat → TTS → speak

**STOP.**

---

### PHASE 6 — WINDOWS DESKTOP (Tauri)

**Goal:** A real desktop presence.

**Deliverables:**
- Tauri shell around the web UI
- System tray, startup option, configurable global shortcut (default `Ctrl+Shift+Space`), Windows notifications
- Open/focus window behavior; backend connection health indicator

**STOP.**

---

### PHASE 7 — PC TOOLS

**Goal:** Safe Windows automation.

**Deliverables:**
- Tools: `open_application`, `open_url`, `get_system_info`, `search_files`, `read_text_file`, `capture_screen`, `analyze_screen`
- Explicit screen analysis only (never continuous monitoring)
- Path sandboxing + permission levels (MEDIUM/HIGH)
- **No unrestricted shell execution**

**STOP.**

---

### PHASE 8 — CALENDAR

**Goal:** Calendar awareness and meeting prep.

**Deliverables:**
- `CalendarProvider` abstraction
- `get today's events`, `get upcoming events`, `create/update/cancel event`
- Meeting preparation: *"Prepare me for my 3 PM meeting."*

**STOP.**

---

### PHASE 9 — EMAIL

**Goal:** Read-first email intelligence.

**Deliverables:**
- `search_email`, `get_email`, `summarize_email`
- Sending email requires explicit confirmation
- Provider abstraction pattern like Calendar

**STOP.**

---

### PHASE 10 — KNOWLEDGE + RAG

**Goal:** Documents you can ask questions about.

**Deliverables:**
- Ingestion: PDF, DOCX, TXT, Markdown → extract → clean → chunk → embed → pgvector
- Retrieval: semantic, keyword, metadata filtering, hybrid (vector + keyword), rerank
- Pipeline endpoint + knowledge UI
- `embed()` on `AIProvider`

**STOP.**

---

### PHASE 11 — PROACTIVE JARVIS

**Goal:** Event-driven intelligence, not LLM polling.

**Deliverables:**
- Events: `DailyStart`, `DailyEnd`, `TaskDueSoon`, `TaskOverdue`, `MeetingSoon`, `FocusCompleted`, `DeadlineApproaching`
- Deterministic rules first; AI only when reasoning helps
- Worker + scheduler services (`services/worker`, `services/scheduler`)
- Notification controls; `Proactive Mode` + `Silent Mode`

**STOP.**

---

### PHASE 12 — DAILY INTELLIGENCE

**Goal:** Morning briefing, evening review, weekly review.

**Deliverables:**
- Morning: priorities, meetings, deadlines, recommended first task
- Evening: completed/unfinished tasks, focus time, accomplishments, tomorrow's priorities
- Weekly: goals, projects, completion, blockers, patterns
- Uses real aggregate data from the DB

**STOP.**

---

### PHASE 13 — ADVANCED AGENTS

**Goal:** Specialized agents only where they earn their keep.

**Deliverables:**
- Orchestrator + Planner / Researcher / Executor pattern (memory shared)
- Candidate agents: Planner, Research, Productivity, Coding, Document, Calendar, Execution
- **Default remains deterministic services** — agents are opt-in per workflow
- LangGraph only if orchestration genuinely benefits

**STOP.**

---

### PHASE 14 — LOCAL LLM

**Goal:** GPU-optional local inference.

**Deliverables:**
- `OllamaProvider` implementing the same `AIProvider` interface
- `AI_PROVIDER=ollama` switch works with zero changes elsewhere
- Optional routing: simple/private → local; complex → Gemini

**STOP.**

---

### PHASE 15 — PREMIUM UI

**Goal:** Polish, only after functionality is reliable.

**Deliverables:**
- Dashboard, command palette, chat, tasks, goals, projects, memory, knowledge, focus, calendar, settings, AI provider management, system status
- Dark + light mode, animations (Framer Motion), responsive, accessible, keyboard shortcuts
- Apple-level simplicity + subtle futuristic feel; performance never sacrificed for effects

**STOP.**

---

### PHASE 16 — PRODUCTION HARDENING

**Goal:** Long-running reliability (14h/day).

**Deliverables:**
- Security/permission/tool audits; DB optimization; rate limiting; retry policies; failure recovery
- Logging, metrics, backup strategy, config validation, startup recovery, graceful shutdown
- Long-running soak test: low idle CPU, stable RAM, no unjustified polling, health checks, queue monitoring, provider failure recovery

**STOP — no more phases.**

---

## 16. PHASE 0 — DEEPER WORK BREAKDOWN (immediate next actions)

Ordered task list for Phase 0 implementation, in sequence:

**Step 1 — Repo restructure**
- Move `app/`, `public/`, `next.config.ts`, `tsconfig.json`, `package.json`, etc. into `apps/web/`
- Create `services/api/`, `infrastructure/`, `docs/`, `scripts/`
- Add root `.gitignore` entries (`.env`, `__pycache__`, `.venv`, `dist`, etc.)
- Keep `anubhav-work/` docs; add `docs/` for long-lived architecture docs

**Step 2 — Backend scaffold**
- `services/api/` with `pyproject.toml` (or `requirements.txt`), `app/main.py`
- FastAPI app factory, CORS (allow `http://localhost:3000`)
- `GET /api/v1/health` → `{ status: "ok", version, provider_configured: bool }`

**Step 3 — Config & logging**
- Pydantic Settings from env; `.env.example`
- Structured JSON logging middleware (request_id, timestamp, operation, duration, status), secret redaction

**Step 4 — Infrastructure**
- `infrastructure/docker-compose.yml` with postgres (pgvector image) + redis, volumes, healthchecks
- Verify `docker compose up -d` and both healthchecks pass

**Step 5 — Database wiring**
- SQLAlchemy async engine + session; Alembic initialized, first no-op migration
- No speculative tables in Phase 0

**Step 6 — Frontend shell**
- Repurpose boilerplate `app/page.tsx` → minimal JARVIS shell (title, status card)
- Client component fetches `/api/v1/health` from the backend and shows real status
- Base mocks/misleading states are forbidden — show "unavailable" if backend is down

**Step 7 — Tests & quality gates**
- pytest: health returns 200 + correct shape; settings load from env
- ruff + mypy/pyright wired into `scripts/`
- Frontend: keep existing lint; add smoke test for status card if feasible in Phase 0

**Step 8 — Docs**
- Root `README.md` rewrite (project overview, prerequisites, how to run: docker compose + api + web)
- `docs/architecture/README.md` + initial ADRs (provider abstraction, no-GPU, permission-first)

**Step 9 — Verify**
- Run backend tests, lint, type check
- Run frontend lint and `next build`
- Manual smoke: web shows backend healthy

**STOP. Report per the completion-report format. Do not start Phase 1.**

---

## 17. Testing Strategy

| Layer | Tools | Scope |
|---|---|---|
| Backend unit | pytest | Services, AI provider (mocked), permission checks, schemas |
| Backend integration | pytest + test DB | Repositories, migrations |
| API | httpx/TestClient | Endpoint contracts, error shapes, auth/confirmation flows |
| AI | MockProvider | Interface conformance; GeminiProvider tested with recorded fixtures, never live keys in CI |
| Frontend | Vitest + RTL | Critical flows: chat stream render, task creation, status card |
| E2E (later) | Playwright | Critical user journeys (Phase 7+ integrates the browser tooling anyway) |

Rule: each phase ships its tests. Never rely on manual verification alone.

---

## 18. Security Checklist (applies from Phase 0)

- [ ] Secrets only in backend env files; `.env` gitignored; never in logs/URLs/localStorage
- [ ] All inputs validated (Pydantic); consistent error responses without internal detail leakage
- [ ] Permission system enforced on every tool; LLM cannot bypass
- [ ] Tool arguments validated against schemas before execution
- [ ] Command allowlist only; destructive commands need explicit confirmation
- [ ] Audit logging of `tool_executions` (phase-appropriate; at minimum log tool name, args hash, result status, request_id)
- [ ] Rate limiting on sensitive endpoints (Redis-backed, Phase 3+)
- [ ] Screen analysis only on explicit request/enabled mode

---

## 19. Observability, Logging & Reliability Targets

- Structured logs with `request_id`, `operation`, `duration`, `status`, `provider`, `model`, `error`
- Never log: API keys, passwords, secrets, unnecessary sensitive content
- Idle-state target (after Phase 11+ hardening): very low CPU, stable RAM, LLM not running unless needed, worker waiting, DB/Redis idle
- Automatic recovery: health checks, retry handling, provider failure recovery, graceful shutdown, queue monitoring
- Metric seeds: AI/API/tool latency, error rates, LLM usage, task completion, worker status, memory usage

---

## 20. Definition of Done per Phase (execution rule)

For every phase `START PHASE X`:

1. Inspect repo → 2. Review previous phase → 3. Identify missing requirements → 4. Write phase implementation plan → 5. Implement → 6. Write tests → 7. Run tests → 8. Run lint → 9. Run type check → 10. Run build → 11. Fix all errors → 12. Update docs → 13. Completion report.

**Completion report format:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JARVIS — PHASE X COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status / Implemented / Files Created / Files Modified /
Database Changes / API Changes / AI Changes / Tests /
Lint / Type Check / Build / Known Issues / Next Phase
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**On failure:** investigate → root-cause → fix → re-run → stabilize. Only report a known issue if it genuinely needs information/credentials we don't have.

---

## 21. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| No GPU limits local AI | Gemini-first; Ollama later behind the same interface |
| Scope creep (the spec is huge) | Hard STOP after each phase; Phase 0 only, now |
| Backend/frontend drift | Shared OpenAPI schema from FastAPI → typed client generation when needed |
| Long-running instability | Event-driven waits, health checks, structured logs, soak tests (Phase 16) |
| Windows-only tooling surprises | Keep PC tools behind interfaces; sandbox paths; test on the actual machine |
| LLM costs / rate limits | Streaming, caching (Redis), usage tracking, deterministic rules before AI |
| API key leakage | Backend-only secrets, redaction, gitignore, env validation |

---

## 22. Bottom Line

1. **Now:** Implement **Phase 0 only**.
2. **Then:** Stop, verify against the Phase 0 acceptance criteria, run all quality gates, deliver the completion report.
3. **Next:** Only after Phase 0 passes, begin Phase 1 (Gemini chat).

The full spec (`01-to-do.md`) remains the definitive requirements source. This roadmap is the execution companion — the *order*, the *structure*, and the *definition of done*.

---
*End of roadmap.*
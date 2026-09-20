# BUILD JARVIS — PERSONAL AI OPERATING SYSTEM

You are the principal software architect, senior full-stack engineer, AI engineer, desktop application engineer, DevOps engineer, security engineer, and UX engineer responsible for building a production-quality personal AI assistant called **JARVIS**.

Do not treat this as a toy chatbot project.

Build it as a serious, modular, extensible **Personal AI Operating System for Windows**.

The user should eventually be able to keep JARVIS running for approximately **14 hours per day** and use it as an intelligent layer over their daily work, tasks, knowledge, schedule, applications, and computer.

---

# 1. PRODUCT VISION

JARVIS should become:

> A personal AI operating layer that understands what I need to accomplish, remembers useful context, helps me plan my day, tells me what I should work on next, and safely performs approved actions on my computer.

The goal is NOT to create another generic ChatGPT clone.

The goal is to build something that becomes genuinely useful in the user's daily life.

The user should eventually be able to say:

```text
"Jarvis, what should I do now?"

"Jarvis, plan my day."

"Jarvis, remember this."

"Jarvis, add this to my tasks."

"Jarvis, remind me tomorrow."

"Jarvis, prepare me for my 3 PM meeting."

"Jarvis, summarize what I accomplished today."

"Jarvis, open my development environment."

"Jarvis, search my notes."

"Jarvis, find the document where I discussed Redis."

"Jarvis, start a focus session."

"Jarvis, look at my screen and tell me what's wrong."

"Jarvis, summarize these documents."

"Jarvis, help me prioritize my work."
```

Eventually JARVIS should be capable of proactive assistance.

---

# 2. USER'S COMPUTER

The initial target machine is:

```text
CPU:
Intel Core i9-14900K

RAM:
32 GB

GPU:
NO dedicated GPU currently

Integrated Graphics:
Intel UHD Graphics 770

Storage:
~1.86 TB

Operating System:
Windows 11 Home 24H2

Architecture:
64-bit x64
```

IMPORTANT:

There is currently NO NVIDIA GPU.

Therefore:

* Do not assume CUDA.
* Do not require a dedicated GPU.
* Do not continuously run a large local LLM.
* Do not design the system around GPU availability.
* Keep background services lightweight.
* Make local AI optional.
* Initially use the Gemini API.
* Design the AI layer so local models can be added later.

When the user eventually installs a GPU, JARVIS should be able to add local LLM support without rewriting the application.

---

# 3. INITIAL AI STRATEGY

## PRIMARY AI PROVIDER

The initial production AI provider is:

**Google Gemini API**

The Gemini API key must be stored ONLY on the backend.

Never expose the API key to:

* frontend
* browser
* client-side JavaScript
* localStorage
* URL
* logs
* Git
* public environment variables

Use:

```text
GEMINI_API_KEY=
GEMINI_MODEL=
AI_PROVIDER=gemini
```

in backend environment configuration.

---

# 4. FUTURE LOCAL AI

The architecture must support:

```text
GeminiProvider
OllamaProvider
OpenAIProvider
OtherProvider
```

but initially implement Gemini only.

Eventually:

```text
AI Router
    │
    ├── Gemini
    │
    └── Ollama
          │
          └── Local LLM
```

The user should eventually be able to change:

```text
AI_PROVIDER=gemini
```

to:

```text
AI_PROVIDER=ollama
```

without rewriting:

* tasks
* memory
* productivity
* tools
* UI
* database
* scheduler
* permissions

---

# 5. GOLDEN ARCHITECTURAL RULE

NEVER allow application business logic to directly depend on Gemini SDK objects.

Bad:

```python
# task_service.py

from google import genai

client = genai.Client(...)
```

Good:

```text
Task Service
      ↓
AI Service
      ↓
AI Provider Interface
      ↓
Gemini Provider
      ↓
Gemini SDK
```

The rest of the system must only know about provider-independent interfaces.

---

# 6. TECHNOLOGY STACK

Use:

## Frontend

* Next.js
* TypeScript
* App Router
* Tailwind CSS
* shadcn/ui
* Framer Motion
* TanStack Query where appropriate

## Backend

* Python
* FastAPI
* Pydantic
* SQLAlchemy
* Alembic
* LangGraph only where agent orchestration genuinely benefits from it

Do NOT use LangChain/LangGraph everywhere unnecessarily.

Prefer simple deterministic services when possible.

## Database

PostgreSQL

Use:

```text
pgvector
```

for semantic memory.

## Cache / background infrastructure

Redis

Use Redis for:

* caching
* jobs
* temporary state
* event queues
* rate limiting where appropriate

## Desktop

Tauri

Eventually provide:

* system tray
* global shortcut
* Windows notifications
* desktop shell

## Browser automation

Playwright

## AI

Initially:

Gemini API

Future:

Ollama/local models

## Voice

Design provider-independent interfaces for:

```text
STTProvider
TTSProvider
```

---

# 7. HIGH LEVEL ARCHITECTURE

Build toward:

```text
                         ┌──────────────────────┐
                         │        JARVIS        │
                         │   Windows Desktop    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Next.js UI      │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       FastAPI        │
                         │      API Layer       │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
                    ▼               ▼                ▼
              AI Orchestrator    Memory          Tool System
                    │               │                │
                    ▼               ▼                ▼
               AI Service       PostgreSQL       Windows
                    │            + pgvector        Browser
                    │                               Files
                    ▼                               Apps
              Model Router                         Calendar
                    │                               Tasks
              ┌─────┴─────┐                         Email
              │           │
              ▼           ▼
           Gemini      Ollama
          (initial)    (future)
```

---

# 8. REPOSITORY STRUCTURE

Create a clean monorepo.

Use approximately:

```text
jarvis/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── ...
│   │
│   └── desktop/
│       └── ...
│
├── services/
│   ├── api/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── core/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   ├── ai/
│   │   │   ├── tools/
│   │   │   ├── memory/
│   │   │   ├── productivity/
│   │   │   └── main.py
│   │   │
│   │   └── tests/
│   │
│   ├── worker/
│   │
│   └── scheduler/
│
├── packages/
│   ├── shared-types/
│   ├── config/
│   └── ui/
│
├── infrastructure/
│   ├── postgres/
│   ├── redis/
│   └── docker/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── decisions/
│
├── scripts/
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
└── ...
```

You may improve the structure if necessary.

Do not create unnecessary microservices.

---

# 9. CORE DOMAIN

Eventually support:

```text
User
Profile
Goal
Project
Task
TaskDependency
Note
Memory
Conversation
Message
CalendarEvent
Reminder
FocusSession
Habit
DailyReview
Notification
Tool
ToolExecution
Permission
AIProvider
AIModel
```

Do not implement everything immediately.

Build incrementally.

---

# 10. JARVIS MODES

Eventually support:

```text
Chat Mode
Command Mode
Planning Mode
Focus Mode
Review Mode
Proactive Mode
Silent Mode
```

---

# 11. JARVIS PERSONALITY

JARVIS should be:

* intelligent
* concise
* helpful
* calm
* proactive when useful
* never annoying
* honest about uncertainty
* action-oriented

Avoid:

* excessive emojis
* unnecessary paragraphs
* fake confidence
* constantly saying "Absolutely!"
* repetitive explanations

When the user asks:

```text
"What should I do now?"
```

JARVIS should generally give **one strong recommendation**, followed by a short reason.

---

# 12. PRODUCTIVITY PHILOSOPHY

JARVIS should help the user:

```text
Plan
→ Focus
→ Execute
→ Review
→ Improve
```

The system should not simply generate lists.

It should help the user make decisions.

---

# 13. "WHAT SHOULD I DO NOW?"

This is one of the most important features.

JARVIS should eventually evaluate:

```text
Current time
Tasks
Priorities
Deadlines
Goals
Projects
Calendar
Estimated effort
Current focus session
Recent activity
```

Then recommend one action.

Example:

```text
Do this now:

Finish API authentication.

Why:

It is your highest-priority unfinished task,
due tomorrow, and you have a 60-minute free block.
```

Do not return 20 recommendations unless explicitly requested.

---

# 14. MEMORY

Use two memory systems.

## Structured memory

PostgreSQL.

Use for:

* tasks
* goals
* projects
* preferences
* reminders
* calendar
* settings

## Semantic memory

PostgreSQL + pgvector.

Use for:

* conversations
* notes
* documents
* project knowledge
* historical context

Do not store everything as embeddings.

Use SQL for structured data.

---

# 15. TOOL ARCHITECTURE

The LLM must never directly control the operating system.

Instead:

```text
User
 ↓
JARVIS
 ↓
LLM
 ↓
Tool Selection
 ↓
Permission Check
 ↓
Tool Execution
 ↓
Result
 ↓
LLM
 ↓
User
```

Tools should include:

```text
create_task
list_tasks
update_task
complete_task

create_note
search_notes

remember
search_memory

start_focus_session
end_focus_session

get_calendar
create_calendar_event

open_application
open_url

search_files
read_file

capture_screen
analyze_screen

search_web

send_notification
```

Add tools gradually.

---

# 16. PERMISSION SYSTEM

Every tool must declare:

```text
tool_name
description
risk_level
requires_confirmation
```

Risk levels:

```text
SAFE
LOW
MEDIUM
HIGH
CRITICAL
```

Example:

```text
list_tasks
SAFE

create_task
LOW

open_application
LOW

read_file
MEDIUM

modify_file
HIGH

delete_file
CRITICAL

send_email
HIGH

execute_shell_command
CRITICAL
```

Never allow the LLM to bypass permission checks.

---

# 17. SHELL SAFETY

Do NOT give JARVIS unrestricted PowerShell or shell execution.

Do not implement:

```text
execute_any_command(command)
```

Instead implement a controlled command system.

Use:

```text
allowlist
risk classification
confirmation
audit logging
```

Destructive commands must require explicit confirmation.

---

# 18. PC CONTEXT

Eventually JARVIS should be able to understand the user's computer context.

Capabilities:

```text
get_system_info
open_application
open_url
search_files
read_text_file
capture_screen
analyze_screen
```

Screen understanding must NOT run continuously by default.

Use:

```text
explicit request
```

or:

```text
explicitly enabled mode
```

---

# 19. EVENT-DRIVEN BACKGROUND ARCHITECTURE

JARVIS must NOT continuously invoke an LLM.

Correct:

```text
Background Service
       ↓
Wait
       ↓
Event
       ↓
Deterministic Rule
       ↓
AI only if necessary
       ↓
Action
       ↓
Wait
```

Incorrect:

```text
LLM
 ↓
every few seconds
 ↓
LLM
 ↓
every few seconds
```

The system should remain lightweight for long-running usage.

---

# 20. 14-HOUR RELIABILITY

JARVIS should be capable of staying available for approximately 14 hours.

Requirements:

* low idle CPU
* stable RAM
* no unnecessary polling
* automatic recovery
* health checks
* structured logs
* graceful shutdown
* queue monitoring
* retry handling
* provider failure recovery

Target idle state:

```text
CPU:
Very low

Memory:
Stable

LLM:
Not running unless needed

Worker:
Waiting

Database:
Idle

Redis:
Idle
```

---

# 21. UI DESIGN

The interface should feel:

**Premium + calm + intelligent + futuristic + professional.**

Do not make it look like a cheap sci-fi movie interface.

Use:

* subtle gradients
* restrained glow
* smooth animations
* strong typography
* excellent spacing
* clear hierarchy
* responsive design
* keyboard accessibility

Think:

```text
Apple-level simplicity
+
modern AI interface
+
subtle futuristic feel
```

---

# 22. DASHBOARD

Eventually create:

```text
┌─────────────────────────────────────────────────┐
│ JARVIS                            10:42 AM       │
│ Good morning, Anubhav                           │
├─────────────────────────────────────────────────┤
│                                                 │
│ TODAY'S PRIORITY                                │
│                                                 │
│ Finish API authentication                       │
│ ███████████████░░░░ 72%                         │
│                                                 │
├──────────────────────┬──────────────────────────┤
│ TASKS                │ CALENDAR                 │
│                      │                          │
│ ● High priority      │ 11:30 Meeting            │
│ ● Documentation      │ 14:00 Review             │
│ ○ Testing            │ 17:30 Planning           │
│                      │                          │
├──────────────────────┴──────────────────────────┤
│                                                 │
│               ASK JARVIS                        │
│                                                 │
│       "What should I do now?"                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

# 23. PAGES

Eventually support:

```text
/dashboard
/chat
/tasks
/goals
/projects
/calendar
/memory
/knowledge
/focus
/insights
/settings
/permissions
/ai-providers
/system
```

Do not build every page in the first phase.

---

# 24. AI PROVIDER ABSTRACTION

Create:

```text
AIProvider
```

with capabilities conceptually including:

```text
generate()
stream()
generate_structured()
generate_with_tools()
```

Create:

```text
AIService
```

which is the only service used by the rest of JARVIS.

Initially:

```text
AIService
 ↓
GeminiProvider
 ↓
Gemini API
```

Later:

```text
AIService
 ↓
OllamaProvider
 ↓
Ollama
 ↓
Local Model
```

---

# 25. GEMINI IMPLEMENTATION

Create:

```text
GeminiProvider
```

Responsibilities:

* authentication
* requests
* streaming
* structured output
* tool/function calling
* retries
* timeout handling
* error normalization
* usage tracking where available

Do not expose Gemini-specific objects to the rest of the application.

Create provider-independent models:

```text
AIRequest
AIResponse
AIMessage
AIToolCall
AIToolResult
AIUsage
AIError
```

---

# 26. FUTURE OLLAMA IMPLEMENTATION

Do not prioritize this now.

Prepare the abstraction so later:

```text
OllamaProvider
```

can be added.

Configuration:

```text
AI_PROVIDER=ollama
OLLAMA_BASE_URL=
OLLAMA_MODEL=
```

The rest of JARVIS should remain unchanged.

---

# 27. DATABASE

Use PostgreSQL.

Create migrations through Alembic.

Initial tables should eventually include:

```text
users
projects
goals
tasks
conversations
messages
memories
notes
focus_sessions
notifications
tool_executions
permissions
```

Do not create all tables if they are not needed for the current phase.

Avoid speculative schema complexity.

---

# 28. REDIS

Use Redis for:

* caching
* temporary state
* background jobs
* event queues
* rate limiting
* distributed locks if needed

Do not use Redis as the primary database.

---

# 29. API DESIGN

Use versioned APIs:

```text
/api/v1/...
```

Examples:

```text
GET  /api/v1/health

POST /api/v1/chat

GET  /api/v1/conversations

POST /api/v1/tasks

GET  /api/v1/tasks

PATCH /api/v1/tasks/{id}

POST /api/v1/tasks/{id}/complete

POST /api/v1/memory

GET  /api/v1/memory/search

GET  /api/v1/productivity/next-action
```

Use Pydantic schemas.

Validate all input.

Return consistent error structures.

---

# 30. LOGGING

Use structured logging.

Every important operation should have:

```text
request_id
timestamp
operation
duration
status
provider
model
error
```

Never log:

* API keys
* passwords
* secrets
* unnecessary sensitive content

---

# 31. OBSERVABILITY

Eventually add:

```text
AI latency
tool latency
API latency
error rates
LLM usage
task completion
background worker status
memory usage
```

Create a simple system status page later.

---

# 32. TESTING

Every phase must include tests.

Backend:

* unit tests
* integration tests
* API tests

Frontend:

* component tests where useful
* integration tests for critical flows

AI:

* mock provider tests
* tool selection tests
* permission tests

Do not rely only on manual testing.

---

# 33. SECURITY

Implement:

* secure environment configuration
* server-side API keys
* input validation
* permission system
* tool sandboxing
* confirmation dialogs
* audit logging
* rate limiting
* safe error handling
* command allowlists

Never trust LLM-generated tool arguments blindly.

Validate them.

---

# 34. DEVELOPMENT PRINCIPLES

When coding:

1. Inspect existing code first.
2. Understand the architecture.
3. Make a plan.
4. Implement incrementally.
5. Reuse existing code.
6. Avoid unnecessary dependencies.
7. Write tests.
8. Run tests.
9. Run lint.
10. Run type checking.
11. Run builds.
12. Fix errors.
13. Update documentation.

Never create fake functionality.

If something isn't implemented, say so.

Never create a UI that pretends an operation succeeded when the backend did not actually perform it.

---

# 35. NO FAKE DATA IN PRODUCTION FLOWS

During development, mock data is allowed only where necessary.

Clearly distinguish:

```text
REAL DATA
MOCK DATA
DEMO DATA
```

The UI must never falsely claim:

```text
"Task created"
```

if the database operation failed.

---

# 36. ENVIRONMENT CONFIGURATION

Create:

```text
.env.example
```

Include appropriate variables such as:

```text
APP_ENV=development

DATABASE_URL=
REDIS_URL=

AI_PROVIDER=gemini

GEMINI_API_KEY=
GEMINI_MODEL=

OLLAMA_BASE_URL=
OLLAMA_MODEL=

NEXT_PUBLIC_API_URL=
```

Do not populate secrets.

---

# 37. DOCKER

Provide:

```text
docker-compose.yml
```

for:

```text
PostgreSQL
Redis
```

Do not unnecessarily containerize every component during early development if native development is simpler.

---

# 38. PHASED DEVELOPMENT

Build the project in exactly these phases.

Do not attempt to implement the entire system in one step.

---

# PHASE 0 — FOUNDATION

Implement:

* repository
* monorepo
* Next.js
* FastAPI
* PostgreSQL
* Redis
* Docker Compose
* environment configuration
* health endpoints
* basic UI
* logging
* documentation
* testing infrastructure

Acceptance:

```text
Frontend starts.

Backend starts.

PostgreSQL works.

Redis works.

Health endpoint works.

Frontend can communicate with backend.

Tests run.

Build succeeds.
```

STOP.

---

# PHASE 1 — GEMINI JARVIS CHAT

Implement:

* GeminiProvider
* AIProvider interface
* AIService
* Gemini configuration
* streaming
* conversations
* messages
* chat API
* chat UI
* conversation history
* error handling
* provider tests

The user should be able to:

```text
Open JARVIS
 ↓
Create conversation
 ↓
Ask question
 ↓
Gemini responds
 ↓
Response streams into UI
 ↓
Conversation persists
```

STOP.

Do not implement tasks yet.

---

# PHASE 2 — TASK MANAGEMENT

Implement:

```text
create_task
list_tasks
get_task
update_task
complete_task
delete_task
```

Build task UI.

Allow natural language commands.

Example:

```text
"Create a task to finish my RAG implementation tomorrow."
```

JARVIS must use the task tool and actually save the task.

Add permission handling.

STOP.

---

# PHASE 3 — MEMORY

Implement:

```text
remember
search_memory
delete_memory
```

Support structured and semantic memory.

Example:

```text
"Remember that my deployment is blocked by access."
```

Later:

```text
"What is blocking my deployment?"
```

JARVIS retrieves the stored memory.

STOP.

---

# PHASE 4 — PRODUCTIVITY ENGINE

Implement:

* goals
* projects
* task priorities
* due dates
* daily planning
* next-action recommendation
* focus sessions

Core endpoint:

```text
GET /api/v1/productivity/next-action
```

The recommendation should use actual user data.

STOP.

---

# PHASE 5 — VOICE

Implement:

* push-to-talk
* STT
* TTS
* listening state
* thinking state
* speaking state
* interruption
* mute

Do not implement always-listening wake word yet.

STOP.

---

# PHASE 6 — WINDOWS DESKTOP

Implement Tauri.

Add:

* system tray
* startup option
* global shortcut
* desktop notifications
* open/focus JARVIS window
* backend connection health

Example shortcut:

```text
Ctrl + Shift + Space
```

Make configurable.

STOP.

---

# PHASE 7 — PC TOOLS

Implement safe Windows tools:

```text
open_application
open_url
get_system_info
search_files
read_text_file
capture_screen
```

Add explicit screen analysis.

Do not implement unrestricted shell execution.

STOP.

---

# PHASE 8 — CALENDAR

Implement provider abstraction:

```text
CalendarProvider
```

Add calendar integration.

Features:

```text
get today's events
get upcoming events
create event
update event
cancel event
```

Add meeting preparation.

STOP.

---

# PHASE 9 — EMAIL

Start read-only.

Implement:

```text
search_email
get_email
summarize_email
```

Sending email requires explicit confirmation.

STOP.

---

# PHASE 10 — KNOWLEDGE + RAG

Implement:

```text
PDF
DOCX
TXT
Markdown
```

Pipeline:

```text
Document
 ↓
Extract
 ↓
Clean
 ↓
Chunk
 ↓
Embed
 ↓
pgvector
 ↓
Retrieve
 ↓
Rerank
 ↓
Generate
```

Support:

* semantic search
* keyword search
* metadata filtering
* hybrid search

STOP.

---

# PHASE 11 — PROACTIVE JARVIS

Implement event-driven intelligence.

Events:

```text
DailyStart
DailyEnd
TaskDueSoon
TaskOverdue
MeetingSoon
FocusCompleted
DeadlineApproaching
```

Use deterministic rules first.

Only invoke AI when reasoning is useful.

Add notification controls.

Add:

```text
Proactive Mode
Silent Mode
```

STOP.

---

# PHASE 12 — DAILY INTELLIGENCE

Implement:

## Morning Briefing

Include:

* today's priorities
* meetings
* deadlines
* recommended first task

## Evening Review

Include:

* completed tasks
* unfinished tasks
* focus time
* important accomplishments
* tomorrow's priorities

## Weekly Review

Include:

* goals
* projects
* task completion
* blockers
* productivity patterns

STOP.

---

# PHASE 13 — ADVANCED AGENTS

Only now introduce specialized agents.

Architecture:

```text
                    JARVIS
                       │
                 Orchestrator
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Planner        Researcher      Executor
        │              │              │
        └──────────────┼──────────────┘
                       │
                    Memory
```

Potential agents:

```text
Planner Agent
Research Agent
Productivity Agent
Coding Agent
Document Agent
Calendar Agent
Execution Agent
```

Do not make every operation an agent.

STOP.

---

# PHASE 14 — LOCAL LLM

Now add:

```text
OllamaProvider
```

Support:

```text
AI_PROVIDER=ollama
```

Test provider switching.

The rest of the application must continue working.

Add optional routing:

```text
simple/private → local

complex → Gemini
```

STOP.

---

# PHASE 15 — PREMIUM UI

Only after functionality is reliable.

Polish:

* dashboard
* command palette
* chat
* tasks
* goals
* projects
* memory
* knowledge
* focus
* calendar
* settings
* AI provider management
* system status

Add:

* dark mode
* light mode
* animations
* responsive layout
* accessibility
* keyboard shortcuts

Do not sacrifice performance for visual effects.

---

# PHASE 16 — PRODUCTION HARDENING

Implement:

* security audit
* permission audit
* tool audit
* database optimization
* API rate limiting
* retry policies
* failure recovery
* logging
* metrics
* backup strategy
* configuration validation
* startup recovery
* graceful shutdown

Test long-running operation.

---

# 39. PHASE EXECUTION RULE

When I tell you:

```text
START PHASE X
```

you must:

### Step 1

Inspect the existing repository.

### Step 2

Review previous phase implementation.

### Step 3

Identify missing requirements.

### Step 4

Create an implementation plan.

### Step 5

Implement the phase.

### Step 6

Write tests.

### Step 7

Run tests.

### Step 8

Run lint.

### Step 9

Run type checking.

### Step 10

Run build.

### Step 11

Fix all errors.

### Step 12

Update documentation.

### Step 13

Give a completion report.

Then STOP.

Do not automatically start the next phase.

---

# 40. COMPLETION REPORT FORMAT

At the end of each phase return:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JARVIS — PHASE X COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status:
COMPLETE

Implemented:
- ...
- ...
- ...

Files Created:
- ...

Files Modified:
- ...

Database Changes:
- ...

API Changes:
- ...

AI Changes:
- ...

Tests:
- ...

Lint:
PASS / FAIL

Type Check:
PASS / FAIL

Build:
PASS / FAIL

Known Issues:
- ...

Next Phase:
PHASE X+1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

# 41. WHEN SOMETHING FAILS

Do not simply report:

```text
There is an error.
```

Investigate it.

Read the error.

Identify the root cause.

Fix it.

Run the failing command again.

Continue until the implementation is stable.

Only report a known issue if it genuinely cannot be resolved without information or external credentials.

---

# 42. WHEN AN API KEY IS REQUIRED

Do not ask the user to paste the API key into chat.

Instead:

1. Create `.env.example`.
2. Explain which environment variable is required.
3. Tell the user where it belongs locally.
4. Never print the secret.
5. Never commit it.

Example:

```text
GEMINI_API_KEY=your_key_here
```

The actual secret must remain local.

---

# 43. USER EXPERIENCE GOAL

Eventually the user's daily workflow should look like:

```text
WINDOWS STARTS
      ↓
JARVIS STARTS
      ↓
Morning briefing
      ↓
User asks:
"What should I do now?"
      ↓
JARVIS recommends one action
      ↓
Focus session
      ↓
Task execution
      ↓
JARVIS stays quiet
      ↓
Meeting reminder
      ↓
Meeting preparation
      ↓
Return to work
      ↓
Document/knowledge search
      ↓
Task completion
      ↓
End-of-day review
      ↓
Tomorrow prepared
```

The product should feel like a **personal executive assistant + AI engineer + knowledge system + productivity coach**, while always remaining under the user's control.

---

# 44. THE MOST IMPORTANT PRODUCT RULE

Do not build JARVIS to maximize the number of features.

Build JARVIS to maximize:

```text
USEFULNESS
RELIABILITY
SAFETY
SPEED
PRIVACY
MAINTAINABILITY
```

The ultimate question for every feature is:

> "Will this actually make the user's day easier?"

If not, do not build it.

---

# 45. START NOW

You are now the coding agent responsible for this repository.

Do NOT merely explain what you would build.

**Actually inspect the repository and start implementing it.**

Begin with:

# PHASE 0 — FOUNDATION

Implement only Phase 0.

Do not implement Phase 1 or later.

After Phase 0 is completely implemented:

* run the application
* run tests
* run lint
* run type checking
* run builds
* fix errors
* update README
* update architecture documentation

Then stop and provide the completion report.

Do not continue automatically.

# END OF PROMPT

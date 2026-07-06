# ORDA Backend

Production-quality backend for **ORDA – AI Historical Journey**, an educational AI platform for exploring Golden Horde historical cities.

## Architecture

Modular Monolith with Clean Architecture:

```
app/
├── api/v1/          # REST routes (validation + DI + service calls only)
├── auth/            # JWT + Argon2 + FastAPI dependencies
├── ai/              # Isolated Groq/LangChain AI module
├── rag/             # RAG pipeline (chunk → embed → pgvector → retrieve → LLM)
├── config/          # pydantic-settings configuration
├── core/            # Unit of Work pattern
├── database/        # Async SQLAlchemy + Redis
├── models/          # ORM models (never exposed to API)
├── schemas/         # Pydantic DTOs (API request/response)
├── repositories/    # Data access layer
├── services/        # Business logic layer
├── migrations/      # Alembic migrations
└── tests/           # pytest unit + integration tests
```

## Tech Stack

- Python 3.13, FastAPI, PostgreSQL, SQLAlchemy 2.0 (async)
- Alembic, Pydantic v2, Redis, JWT, Argon2
- Groq API, LangChain, pgvector
- Docker, uv, Ruff, Pyright, pytest

## Quick Start

```bash
# Copy environment config
cp .env.example .env

# Start infrastructure
docker compose up -d postgres redis

# Install dependencies
uv sync --dev

# Run migrations
uv run alembic upgrade head

# Start API
uv run uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh JWT |
| GET | `/api/v1/users/me` | Current user profile |
| GET | `/api/v1/cities` | List cities |
| GET | `/api/v1/cities/{id}` | City details |
| GET | `/api/v1/artifacts` | List artifacts |
| GET | `/api/v1/quests` | List quests |
| POST | `/api/v1/chat` | AI historian chat (RAG) |
| GET | `/api/v1/progress` | User progress |
| POST | `/api/v1/progress` | Create progress |
| GET | `/api/v1/progress/stats` | XP, coins, level, streak, and unlocks |
| GET | `/api/v1/progress/achievements` | Achievements unlocked by the current user |
| POST | `/api/v1/progress/quests/{id}/complete` | Complete a quest and receive XP/coin rewards |
| POST | `/api/v1/progress/daily-login` | Claim the daily login streak reward |
| POST | `/api/v1/progress/spend-coins` | Spend coins on a cosmetic/unlock |
| GET | `/api/v1/progress/leaderboard` | Top players by XP, coins, streak, and achievements |
| POST | `/api/v1/quiz` | Submit quiz |
| POST | `/api/v1/certificates` | Issue certificate |

## Development

```bash
# Lint
uv run ruff check .

# Type check
uv run pyright

# Tests
uv run pytest -v
```

## Docker

```bash
docker compose up --build
```

## Design Decisions

1. **Modular Monolith** – domains are isolated modules sharing infrastructure; can be extracted to microservices later without rewrite.
2. **Repository + Service + UoW** – routes never touch SQLAlchemy; transactions managed centrally.
3. **Separate ORM/Schema layers** – API contracts are stable even when DB schema evolves.
4. **Isolated AI module** – Groq is never called from routes; RAG pipeline enforces context-only answers.
5. **Redis caching** – cities list and chat history cached for performance.
6. **UUID PKs** – safe for distributed systems and public API exposure.

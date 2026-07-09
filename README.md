# Myavana Chatbot System

A monorepo of AI-powered hair care chatbots serving multiple brands. Built with Node.js, Google Gemini, PostgreSQL, and Redis. Deployed on Google Cloud Run and integrated with the Kommunicate messaging platform.

---

## Repository Structure

```
packages/
├── core/                   # Shared infrastructure (DB, AI, caching, post-processing)
├── myavana/                # Myavana brand chatbot (primary)
├── myavana-xai/            # Myavana variant using xAI Grok
└── sienna-naturals/        # Sienna Naturals brand chatbot
```

Each package is an independent deployable Node.js service. `core` is a shared library consumed by the other three.

---

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- Redis

---

## Running Locally

### Myavana chatbot

```bash
cd packages/myavana
npm install
cp .env.example .env   # fill in your keys
node src/index.js
```

Server starts on port 8080 by default (`PORT` env var to override).

### Core (library only — no server)

```bash
cd packages/core
npm install
```

---

## Environment Variables

Each package has its own `.env` file. Required variables for the Myavana bot:

```env
# Google Gemini
GENKIT_API_KEY=your_gemini_api_key

# PostgreSQL
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=myavana_db
DB_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
PORT=8080
NODE_ENV=development
```

---

## Running Tests

### Core package

```bash
cd packages/core
npm install
npm test
```

### Myavana package

```bash
cd packages/myavana
npm install
npm test
```

Tests use Jest and mock all external dependencies (no live DB or API keys needed).

---

## Architecture Overview

```
Kommunicate (messaging platform)
        │  POST webhook
        ▼
  MyavanaChatbotServer (Express)
        │
        ├─ WELCOME event ──► handleWelcomeEvent()
        ├─ Image event   ──► handleImageMessage() → Gemini vision
        │
        └─ Text message:
              │
              ├─ cacheManager.checkCacheValidity()
              │     hit: use cached Gemini system instructions
              │     miss: constructPrompt() → build ~8k-token system prompt
              │                              → cacheManager.getOrCreateCache()
              │
              ├─ Gemini 3.0 Flash (primary, cached)
              │     fail ──► Gemini 2.5 Flash (fallback, full prompt)
              │                   fail ──► HTTP 500
              │
              ├─ res.json(cleanedResponse) ◄── user sees response
              │
              └─ setImmediate (non-blocking):
                    postProcessConversation()  ← AI extracts user profile + hair issues
                    postResponseProcessing()   ← saves to DB, updates Redis
```

### Key design decisions

| Decision | Reason |
|---|---|
| Gemini cached content | System prompt is large (~8k tokens); caching it saves ~60% latency and token cost on repeat messages |
| Non-blocking post-processing | Profile updates and product extraction are not on the critical path — response is sent first |
| Prompt construction only on cache miss | DB fetches (products, FAQs, etc.) are expensive; skip entirely when cache is valid |
| Per-user cache keyed by userId | Different users may have different training data or profile context in the future |

---

## Package Documentation

- [core/README.md](packages/core/README.md) — Full API reference for the shared library
- [myavana/README.md](packages/myavana/README.md) — Request format, response format, flow, deployment
- [myavana-xai/README.md](packages/myavana-xai/README.md) — xAI Grok variant
- [sienna-naturals/README.md](packages/sienna-naturals/README.md) — Sienna Naturals brand variant

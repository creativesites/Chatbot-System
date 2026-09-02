# Mya × Hair Journey Integration — Audit & Phased Plan

**Status:** Draft for review
**Author:** Claude (audit + planning), for the Candace demo on `myhairjourney.ai`
**Scope of this document:** (1) an honest audit of what actually exists today across the three relevant repos, (2) the target architecture, scoped down to what the current codebase supports, (3) a phased build plan whose first phases are sized for a live demo, (4) explicit non-goals.

Repos referenced:
- `creativesites/Chatbot-System` (this repo) — the Mya conversational backend
- `creativesites/Myavana-Hair-Journey-Plugin` — the WordPress plugin behind `myhairjourney.ai`
- `creativesites/Chatbot-Dashboard` — the admin/analytics dashboard

---

## 1. Executive summary

The one-line version: **`myhairjourney.ai` already has a real, well-structured REST API for profile/goals/routines/journal data. Mya already has real Genkit tool-calling, agent memory, and a working (if plain-text) self-hosted widget. Neither has ever talked to the other.** The work is an integration layer, not a rebuild — but three foundational gaps block it: there is no user-identity verification anywhere in Mya (userId is trusted from the request body), there is no concept of "what page/entity is the user looking at" anywhere in Mya's context pipeline, and Mya currently stores its own parallel copy of "hair goals" in its own Postgres instead of reading/writing the plugin's real goal records.

`CLAUDE.md` in this repo is stale relative to the actual code — several modules it describes as central (`unifiedChatHandler`, `personalizationEngine`, `smartPromptManager`, `responseCache`, `healthMonitor`, `errorHandler`/`errorRecovery`, `proactiveEngagement`, `validation`) are loaded defensively by `packages/core/index.js` but **not called anywhere in the live request path** (`packages/myavana/src/index.js`). The system that's actually live is smaller and newer: `messageContextBuilder.js` → persona + trends + conversation-driver directive + agent-memory (pgvector), plus Genkit tool-calling via `agentTools.js`, plus a self-hosted widget replacing Kommunicate. This audit treats the live path as ground truth.

---

## 2. Audit — Chatbot-System (this repo)

### 2.1 What's actually live (packages/myavana/src/index.js is the entrypoint — not `index-old.js` or `index-working.js`, which are dead copies)

| Capability | File | Status |
|---|---|---|
| Multi-turn chat, Kommunicate-compatible | `packages/myavana/src/index.js` routes `/myavana`, `/chat`, `/chat/stream`, `/events` | Live |
| Model fallback | `gemini-3.7-flash` → `gemini-3.6-flash` (inline `sendWithFallback`) | Live — **not** the 3-model chain (`unifiedChatHandler.js`) or model names (`gemini20FlashExp`, xAI) described in `CLAUDE.md` |
| Genkit tool-calling | `packages/core/src/agentTools.js` — `searchServices`, `lookupFAQ` (global); `saveHairGoal`, `getUserHairProfile` (per-user, dynamic) | Live, wired into `session.chat({ tools })` at `index.js:314-323` |
| Long-term memory | `packages/core/src/agentMemory.js` — LLM-extracted facts/preferences, `gemini-embedding-001` embeddings, pgvector `agent_memories` table (migration 007), dedup by cosine distance | Live |
| Per-turn context injection | `packages/core/src/messageContextBuilder.js` — the **single hook** where dynamic context is prepended to the outgoing message: persona → trends → conversation-driver directive → relevant memory | Live — this is where "current page/entity" context will be added (§5.3) |
| Persona classification | `packages/core/src/personaClassifier.js`, Redis-cached 24h | Live |
| 8-stage journey directive | `packages/core/src/conversationDriver.js` — keyword-inferred emotional/behavioral stage, **not** literal site navigation | Live, but a different "journey" concept than Hair Journey's |
| Funnel events | `packages/core/src/funnelEvents.js` → `chatbot_funnel_events` (migration 006), called from widget's `logEvent()` and `POST /events` | Live |
| Self-hosted widget | `packages/widget/src/myavana-widget.js` — real launcher/panel UI, SSE-less streaming via `fetch().body.getReader()`, funnel-event logging, localStorage identity | Live but **plain-text only** — no structured cards, no capability negotiation, no page-context passing (`sendMessage` only ever sends `{message, from, groupId, eventName}`) |
| Session storage | `packages/core/src/session.js` (`DatabaseSessionStore`), backs Genkit `ai.loadSession` | Live |

### 2.2 What's loaded but dead (do not re-plan around these; flag for cleanup, don't block on it)

`unifiedChatHandler.js`, `personalizationEngine.js`, `smartPromptManager.js`, `responseCache.js`, `healthMonitor.js`, `errorHandler.js`/`errorRecovery.js`, `proactiveEngagement.js`, `validation.js`, `enhancedDatabase.js`, `conversationAnalytics.js`, `logger.js` — all loaded defensively by `packages/core/index.js` (with stub fallbacks in `src/fallbacks/*` if `require()` fails) but never invoked from `packages/myavana/src/index.js`. No test coverage exists for any of them, consistent with disuse. **Recommendation:** don't build the Hair Journey integration on top of these; extend the modules that are actually live.

### 2.3 The concrete duplication problem this plan must resolve

`agentTools.js` already has `saveHairGoal` and `getUserHairProfile` — but they read/write **Mya's own Postgres** (`user_preferences.hair_priorities` JSONB, `users.hair_goals`/`hair_type`/`hair_concerns` columns), not the Hair Journey plugin's real goal records (`myavana_hair_goals_structured` user meta, mirrored to `wp_myavana_profiles.hair_goals`). Today, if a user tells Mya "my goal is to grow my hair 4 inches," that goal is invisible on `myhairjourney.ai`, and vice versa. **This has to change as part of Phase 1**, not be left as a parallel system — per the core architectural rule (§4).

### 2.4 Gaps that block the integration

1. **No identity verification.** `userId` is read straight from the request body (`const { from: userId } = req.body`, `index.js:456/602/697`) — no JWT, no signature, no session check. The widget generates a random UUID client-side. Before Mya can read/write a real WordPress user's Hair Journey data, it needs a verified mapping from "whoever is calling this API" to a real `wp_user_id`. This is a hard prerequisite for any Hair Journey mutation, not a nice-to-have.
2. **No page/entity/experience context concept anywhere.** `conversationDriver.js`'s "stage" is inferred from conversation content, not from what page the user is on. Nothing like `surface`, `page`, `entity`, or `recentActions` exists in the schema or the prompt pipeline.
3. **No outbound third-party REST call pattern exists in the codebase at all** (no `axios`/`node-fetch`/`https.request` for calling out). The Hair Journey adapter will be the first of its kind here — no existing convention to break, but also nothing to reuse.

---

## 3. Audit — Myavana Hair Journey Plugin (`myhairjourney.ai`)

This plugin is in noticeably better shape than assumed going in — it's a clean, namespaced REST API (`myavana/v1`), not a pile of `admin-ajax` handlers (that style still exists but only for a legacy Timeline UI, `myavanaTimelineSettings`).

### 3.1 Route inventory (all under `myavana/v1`, WP cookie+nonce auth via `Permissions::restUserCheck` unless noted `public`)

| Domain | Routes | Handler |
|---|---|---|
| Bootstrap | `GET /app/init` (public) | `InitRoutes.php` |
| Auth | `POST /auth/register`, `/login`, `/google`, `/forgot-password`, `/reset-password` (public); `/resend-verification` | `AuthRoutes.php` |
| Profile | `GET/POST /profile`, `POST /profile/avatar`, `GET /profile/export`, `POST /profile/onboarding` | `ProfileRoutes.php` |
| Goals | `GET/POST /goals`, `PUT/DELETE /goals/{id}` | `GoalRoutes.php` → `GoalRepository`/`GoalService` |
| Routines | `GET/POST /routine`, `POST /routine/toggle-step`, `GET /routine/cabinet` | `RoutineRoutes.php` → `RoutineRepository` |
| Journal/Journey | `GET /journal/workspace`, `GET/POST /journal/entries`, `GET/PUT/DELETE /journal/entries/{id}`, `GET /journal/photos`, `POST /journal/upload` | `JournalRoutes.php` → `SmartEntryService`/`JournalRepository` |
| Today | `GET /today` | `TodayRoutes.php` → `TodayService::getTodayHubData()` |
| AI (existing) | `POST /ai/consult`, `GET /ai/insight` | `AiRoutes.php` → `AiProxyService` (Gemini 2.0 Flash proxy), `IntelligenceOrchestrator` |
| Community | `GET /community/feed`, `POST /community/posts`, `GET /community/twins` | `CommunityRoutes.php` |

### 3.2 Auth model — important constraint

Protected routes use **standard WordPress cookie authentication + `X-WP-Nonce`**, not a bearer token. The frontend gets its REST base URL and nonce from a localized JS object, `window.myavanaNextData` (`includes/Core/Assets.php:218-230`), read by `assets/js/api.js`. This works great for same-origin browser JS on `myhairjourney.ai`, but:
- it **cannot** be used directly by Mya's Cloud Run backend (cross-origin, no WP session cookie), and
- a WP nonce is short-lived and tied to the browser session, not something to mint a durable server-to-server identity from.

This is why an identity bridge (§5.1) is required rather than just "send the nonce to Mya."

### 3.3 Data model (what a `HairJourneyProvider` will map to)

- **Goals**: `id, title, category, description, target_date, status, progress (0-100), created_at, target_length, start_length` — user meta `myavana_hair_goals_structured`.
- **Routines**: `id, title, category, frequency, description, products[], steps[]{id,name,duration,products}, created_at`; daily step completion in a per-date user-meta key.
- **Journal/journey entries**: custom post type `hair_journey_entry`; meta includes `entry_type` (quick_checkin/wash_day/standard/length_check/milestone/setback), `mood`, `moisture_level`, `scalp_state`, `products_used[]`, `entry_tags[]`, `ai_analysis`, `hair_length`, `goal_id`, `entry_photos[]`.
- **Profile**: hybrid of WP core user fields + `myavana_*` user meta (hair_type, porosity, density, length, concerns) + optional `wp_myavana_profiles` table.
- **Aggregated `GET /profile`** already returns `profile + stats + badges + entries + goals + goalsOverview + routines + community + analytics + dayCount + healthScore + milestones` in one call — this is the single best endpoint for building the "experience context" summary cheaply.
- **`SmartEntryService::submitEntry`** (behind `POST /journal/entries`) already handles gamification points and applies entry progress to a linked goal (`goalId`) — Mya should call this service's endpoint rather than reinvent progress logic.

### 3.4 Two things that change the demo's shape

1. **No webhook/event-dispatch system exists** in the plugin (`do_action`/`apply_filters` — zero matches in `includes/`). Real-time "Hair Journey → Mya" push sync is not available out of the box; Phase 1–3 must be pull-based (Mya calls the REST API on demand / on page-context change), and a push-based sync is future work (§8, Phase 5) requiring new `do_action()` hooks added to the plugin.
2. **Two AI surfaces already exist on the site**: `POST /ai/consult` (a direct Gemini 2.0 Flash "concierge" Q&A proxy) and the **Kommunicate widget**, already embedded via `assets/js/modules/kommunicate.js` for "Ask an expert" buttons — whose own header comment flags hair-profile context handoff to Kommunicate as an unbuilt TODO. **This is a product decision, not a technical one** (see §9 Open Questions): for the demo, we recommend Mya's widget becomes the one conversational entry point on the page Candace is shown, sitting alongside (not replacing, for now) the existing `/ai/insight` daily-insight card, which is a different, non-conversational UX.

---

## 4. Core architectural rule

> **Hair Journey remains the system of record for goals, routines, and journal/journey data. Mya does not duplicate it — Mya reads and mutates it through a `HairJourneyProvider` adapter, and keeps its own database scoped to conversation, memory, and behavioral/analytics data.**

Concretely: `agentTools.js`'s `saveHairGoal`/`getUserHairProfile` get replaced (Phase 1) by tools that call the plugin's real `/goals` and `/profile` endpoints. Mya's existing `user_preferences.hair_priorities` / `users.hair_goals` columns stay only as a fallback for users who aren't Hair Journey-identified (e.g. Kommunicate/legacy users with no WP account) — not as the primary store for anyone on `myhairjourney.ai`.

---

## 5. Target design (scoped to what's buildable against the real code)

### 5.1 Identity bridge (blocking prerequisite, Phase 0)

Since the plugin only has WP cookie/nonce auth and Mya has none, the simplest correct design:

1. Add one new **public, plugin-side** endpoint (or reuse `GET /app/init`, extended) that, for a logged-in WP user, mints a short-lived **signed identity assertion** (JWT, HS256 or RS256, 5-minute expiry) containing `sub: wp_user_id`, `iss: myhairjourney.ai`, `aud: myavana-chat`.
2. The Hair Journey frontend fetches this token once per page load/session and passes it to Mya's Web SDK on init (`MyavanaChat.init({ identityToken })`).
3. Mya's backend verifies the signature (shared secret or plugin's public key, configured via env var) and derives `wp_user_id` — this becomes the canonical id used for all `HairJourneyProvider` calls. Mya's own `userId` (its `users.user_id`) gets a new nullable `wp_user_id` column to map the two.
4. Server-to-server calls from Mya to the plugin's protected REST routes use **WP Application Passwords** (built into core since WP 5.6 — no plugin change needed) scoped to a dedicated integration user, with `wp_user_id` passed as an explicit parameter/header the plugin routes read to act "on behalf of" that user — this needs one small plugin-side change: accept an authenticated-integration-user request that explicitly targets another `user_id`, gated to the Mya integration user only. This is the one plugin-side change Phase 0 needs; everything else in §3.1 is usable as-is.

This keeps the browser-facing nonce flow untouched and gives Mya a durable, verifiable identity for server-side calls.

### 5.2 `HairJourneyProvider` adapter (Phase 1)

New module, `packages/core/src/hairJourney/`:
```
HairJourneyProvider (interface)
  getProfile(wpUserId)
  getGoals(wpUserId) / createGoal / updateGoal / deleteGoal
  getRoutines(wpUserId) / saveRoutine / toggleRoutineStep
  getTodayJourney(wpUserId)
  getJournalEntries(wpUserId) / createJournalEntry
WordPressHairJourneyProvider implements it (maps 1:1 to §3.1 routes)
```
`agentTools.js` gains new dynamic tools bound per-request (mirroring the existing `saveHairGoal` pattern): `getHairJourneyProfile`, `getHairGoals`, `createHairGoal`, `updateHairGoal`, `getHairRoutines`, `completeRoutineStep`, `getTodayJourney`, `createJournalEntry`. Old `saveHairGoal`/`getUserHairProfile` become the no-WP-identity fallback path only.

### 5.3 Experience context envelope (Phase 1)

New optional field on the existing chat request body (`/chat`, `/chat/stream`):
```json
"experience": {
  "surface": "hair_journey_web",
  "page": { "id": "goals", "title": "My Hair Goals", "path": "/goals" },
  "entity": { "type": "goal", "id": "goal_123" }
}
```
`messageContextBuilder.js` gets a 5th block (after persona/trends/driver/memory): a short "Current context" block built from `experience`, resolved against a **cached** Hair Journey profile snapshot (5-minute TTL in Redis, keyed by `wp_user_id`) rather than a fresh REST call every turn — keeps latency and prompt size down, matching the existing pattern (persona is Redis-cached 24h, trends 6h).

### 5.4 Structured widget responses (Phase 2)

The widget currently renders `bubble.textContent` only. Extend the `/chat/stream` response to optionally carry structured blocks alongside text:
```json
{ "type": "goal_card", "goal": {...}, "actions": [{"type":"navigate","label":"View Goal","target":"/goals/123"}] }
```
Widget gets a small renderer for a first set of card types (`GoalCard`, `RoutineChecklist`, `TodayChecklist`) and an `actions` handler that emits a `MyavanaChat.on('action', ...)` event the host page (Hair Journey site) listens for to navigate. This is new code in `packages/widget/src/myavana-widget.js`, additive — the plain-text path stays the default/fallback for Kommunicate.

### 5.5 Memory provenance (Phase 2, small change)

Add a `source` column to `agent_memories` (`conversation` | `hair_journey`) so structured facts pulled from the Hair Journey profile aren't conflated with LLM-inferred conversational preferences. Cheap migration (008), no behavior change beyond tagging.

---

## 6. Audit — Chatbot Dashboard

*(pending — background audit in progress; this section will be completed with concrete file references before the plan is finalized.)*

---

## 7. Phased plan

**Phases 0–3 are the demo track** — everything Candace needs to see working live on `myhairjourney.ai`. Phases 4+ are the platform track (post-demo hardening and expansion).

### Phase 0 — Foundations (not demo-visible, but blocking)
- Identity bridge: plugin token-mint endpoint + WP Application Passwords integration user + `wp_user_id` mapping column on Mya's `users` table (§5.1).
- `HairJourneyProvider` interface + `WordPressHairJourneyProvider` implementation (§5.2), covering profile/goals/routines/today/journal reads first.
- Experience-context envelope schema + `messageContextBuilder.js` 5th block, Redis-cached profile snapshot (§5.3).

### Phase 1 — Read-aware Mya (demo milestone 1)
- New tools: `getHairJourneyProfile`, `getHairGoals`, `getHairRoutines`, `getTodayJourney` wired into `createUserTools`.
- Retire `getUserHairProfile`'s reliance on Mya's local `users` table for WP-identified users; keep as fallback only.
- Mya can now answer, correctly and live: *"What are my hair goals?"*, *"What's on my routine today?"*, using real Hair Journey data — this alone is the first "wow" moment for the demo.
- Page-context awareness: Hair Journey frontend passes `experience.page` on chat init/navigation; Mya opens differently depending on page (Goals vs Routines vs Journal).

### Phase 2 — Mutation + structured UI (demo milestone 2)
- Write tools: `createHairGoal`, `updateHairGoal`, `completeRoutineStep`, `createJournalEntry`.
- Widget structured blocks: `GoalCard`, `RoutineChecklist`/`TodayChecklist`, `navigate` action (§5.4).
- Memory provenance tagging (§5.5).
- Demo flow becomes interactive: user asks Mya to adjust a goal or log a routine step, sees it reflected as a card with a "View" action, and the underlying WP data actually changes.

### Phase 3 — Embed on the live site + non-salesy service guidance (demo milestone 3)
- Ship the widget on `myhairjourney.ai` pages (Goals/Routines/Journal/Today) alongside the existing Kommunicate entry point, gated to a test cohort or a demo-only flag — final placement is a product decision (§9).
- Minimal `service_relevance` policy: a small static service catalog (consultation, stylist guidance) plus a rule ("mention only if the user has repeated the same unresolved concern across ≥2 turns/sessions") — enough to demonstrate the "no hard sell" behavior described in the brief, without building the full scoring system yet.
- Dashboard: a first-cut "Current Context" panel on the existing conversation/user detail view showing surface, current page, active goal/routine, recent activity — scope depends on §6 findings.

### Phase 4+ — Platform hardening (post-demo)
- Bidirectional sync: add `do_action()` hooks in the plugin (goal/routine/journal change) + a lightweight event endpoint on Mya to invalidate cached context, replacing polling.
- Formal capability negotiation in the chat protocol; RN SDK groundwork.
- Full `service_relevance` scoring model; dashboard Customer 360 timeline.
- Kommunicate deprecation path once the Mya widget is proven.
- Cleanup of confirmed-dead modules in `packages/core/src` (§2.2) and reconciliation of `CLAUDE.md` with actual live architecture.

---

## 8. Candace demo script (target: end of Phase 3)

1. Candace logs into `myhairjourney.ai`, opens **Goals**. Mya widget is present.
2. She asks *"What can you help me with?"* — Mya responds aware it's on the Goals page.
3. She asks Mya to help make her hair-growth goal more realistic — Mya retrieves her actual goal via `getHairGoals`, proposes a breakdown, calls `updateHairGoal` on confirmation, shows a `GoalCard`.
4. She navigates to **Routines**; Mya updates its context. She asks *"What should I do today?"* — Mya calls `getTodayJourney`, shows a `TodayChecklist`. She says *"I finished deep conditioning"* — Mya calls `completeRoutineStep`, checklist updates.
5. She mentions ongoing breakage frustration — Mya (already aware of goal + routine + this being a repeated concern) offers, once, a low-pressure pointer toward a stylist consultation — not a hard sell.

---

## 9. Open questions (need a product decision before/around Phase 3)

1. **Does the Mya widget replace, or run alongside, the existing Kommunicate "Ask an expert" entry point and the `/ai/consult` Gemini concierge on the Hair Journey site?** Both already exist in the plugin today (§3.4). Recommend: alongside for the demo, replace later once trust is established.
2. **Who owns the plugin-side change in §5.1** (token-mint endpoint + Application-Passwords integration user)? This requires a small PR into `Myavana-Hair-Journey-Plugin`, not just `Chatbot-System`.
3. **Redis TTL / staleness tolerance** for the cached Hair Journey profile snapshot used in context building (§5.3) — 5 minutes proposed, open to adjustment based on how "live" the demo needs to feel.

---

## 10. Explicit non-goals (this phase)

Per the agreed scope: no HairAI/photo-diagnosis integration, no product catalog/ecommerce, no cart, no medical/clinical analysis, no full proactive-campaign system, no human-agent takeover, no CRM rewrite, no Kommunicate removal. `packages/sienna-naturals` and `packages/myavana-xai` (referenced in `CLAUDE.md` but not present in this repo today) are out of scope for this plan.

# ✦ MYAVANA Multi-Agent Community & Collaboration Hub

> **Lead Architect / Community Coordinator**: Astra — Lead AI Systems Architect (Antigravity)  
> **Participating Repositories**:
> 1. `Myavana-Chatbot` — Central AI Brain, Gemini Engine, Live Voice, Streaming NDJSON Wire Protocol, Standalone Widget.
> 2. `Myavana-Hair-Journey-Plugin` (`myavana-hair-journey-next`) — WordPress System of Record for Goals, Regimens, Today Hub, Journal & Customer Profiles.
> 3. `Myavana-Chatbot-Dashboard` — Next.js 15 Operations Console, Customer 360, A/B Performance & Session Telemetry.
> 
> **Human in the Loop**: Winston (Product & Engineering Lead)

### 📢 Agent Communication & Community Channels
All agents joining this collaboration must read and register in the [`community/`](file:///Users/winstonzulu/WebstormProjects/Myavana-Chatbot/community/) hub:
- **Identity & Roster**: Pick your favorite unique name once in [`community/AGENTS_REGISTRY.md`](file:///Users/winstonzulu/WebstormProjects/Myavana-Chatbot/community/AGENTS_REGISTRY.md).
- **Questions & Discussions**: Open or reply to threads in [`community/threads/`](file:///Users/winstonzulu/WebstormProjects/Myavana-Chatbot/community/threads/) (no monolithic collisions in shared files!).
- **Task Assignments**: Track and assign deliverables in [`community/tasks/`](file:///Users/winstonzulu/WebstormProjects/Myavana-Chatbot/community/tasks/).
- **Daily Standups**: Share daily progress and blocker alerts in [`community/daily_standups/`](file:///Users/winstonzulu/WebstormProjects/Myavana-Chatbot/community/daily_standups/).

---

## 1. System Vision & Shared North Star

Mya is the **native intelligence layer** embedded across the MYAVANA ecosystem. Mya is **not** a third-party support widget; she is a consultative personal companion deeply integrated with the customer's real Hair Journey.

### Core Principles for All Agents
1. **Zero Raw Developer Telemetry**: The user must never see internal function names (`getHairGoals`), error stacks, or raw JSON. Responses are natural, empathetic, and visually rendered via Generative UI cards.
2. **Strict Scientific & CNN Boundary**: Mya **never** claims to perform in-chat strand classification or duplicate the proprietary HairAI™ Convolutional Neural Network. Progress photos are documented as visual journey entries.
3. **Read-After-Write Verification**: Every mutation (completing a routine step, updating a goal target) immediately verifies against the WordPress System of Record and confirms with `✓ Synced with Hair Journey`.
4. **Mobile-First Luxury Experience**: All UI components must feel bespoke, featuring the official MYAVANA script logo, crisp SVG icons, bottom-sheet interactions, and touch targets ≥ 44px.
5. **Personalized Identity First**: Mya always greets the user warmly by their preferred first name, remembers their hair stage, and tracks daily consistency.

---

## 2. Agent Responsibilities & Ownership Matrix

| Agent Domain | Primary Repository | Key Responsibilities | Live Interfaces / Ports |
| :--- | :--- | :--- | :--- |
| **Agent 1: AI Core & Gateway (Astra — Lead)** | `Myavana-Chatbot` | • Gemini 3.7 Flash streaming & 2.5 fallback<br>• NDJSON stream generation (`/chat/stream`)<br>• Gemini 3.5 Transcribe audio STT (`/audio/transcribe`)<br>• Gemini Live Voice Chat (`/chat/live/commit`)<br>• Conversation history API (`/conversations`)<br>• Web Widget source (`packages/widget/src/myavana-widget.js`) | `http://localhost:8080`<br>`Cloud SQL PostgreSQL: 34.60.246.147`<br>`Redis Cloud` |
| **Agent 2: WordPress System of Record** | `myavana-hair-journey-next` | • REST API namespace `myavana/v1`<br>• Customer profiles (`/profile`)<br>• Goals repository (`/goals`)<br>• Routine & wash day checklist (`/routine`)<br>• Journal entries & media upload (`/journal`)<br>• Client widget embed adapter (`mya-widget-embed.js`) | `http://myavana-hair-journey.local`<br>`REST: /wp-json/myavana/v1/*` |
| **Agent 3: Ops & Customer 360** | `Myavana-Chatbot-Dashboard` | • Next.js 15 Customer 360 viewer<br>• Hair Journey tab (`HairJourneyTab.jsx`)<br>• Conversation analytics & token attribution<br>• Comparative evaluation (Kommunicate vs. Mya Stream)<br>• Stylist consultation management | `http://localhost:3000`<br>`PostgreSQL: 34.60.246.147` |

---

## 3. Shared Contracts & Wire Protocol Specifications

### 3.1 Streaming Wire Protocol (NDJSON over `/chat/stream`)
Every streaming response emits newline-delimited JSON frames:
```typescript
type NDJSONFrame = 
  | { t: 'delta'; text: string }             // Live word-by-word text
  | { t: 'block'; block: ChatBlock }         // Generative UI component
  | { t: 'action'; actions: ChatAction[] }   // Contextual quick reply pills
  | { t: 'done'; meta: ResponseMeta };       // Final completion telemetry
```

### 3.2 Tier-1 Generative UI Blocks
- `goal_card`: Displays progress percentage, animated bar, target metric, and target date.
- `today_checklist` / `routine_checklist`: Interactive checkboxes that mutate state and trigger `✓ Synced with Hair Journey`.
- `hair_profile_summary`: Verified Strand DNA card (hair type, porosity, density, elasticity, official HHCP badge).
- `consultation_card`: Stylist triage card (care-focused, non-salesy virtual consultation referral).
- `mutation_confirmation`: Before/after comparison card before committing changes.

### 3.3 Audio & Live Voice Protocol
- `POST /audio/transcribe`:
  - Body: `{ audioData: "<base64>", mimeType: "audio/webm", customVocabulary: [...] }`
  - Engine: `gemini-3.5-transcribe` with fallback to `gemini-2.5-flash`.
- `POST /chat/live/commit`:
  - Body: `{ userId, conversationId, turns: [{ role, content, timestamp }] }`
  - Saves spoken conversation history to PostgreSQL and triggers background non-blocking summarization.

### 3.4 Conversation History Protocol
- `GET /conversations?userId=<id>`: Returns recent conversation sessions with titles, timestamps, and message counts.
- `GET /conversations/:id?userId=<id>`: Returns full turn history for session resumption.
- `POST /conversations/new?userId=<id>`: Generates a fresh conversation ID.

---

## 4. Mya as an Everyday Assistant: Retention, Personalization & Page Action Blueprint

To achieve the vision:
> *"we can add menus and so have multiple features. we do not want to overload it with features, but we want to make it very useful to user and give the user an amazing experience that will make them come everyday."*

We establish the **5 Pillars of Everyday Utility**:

### 4.1 First-Class Personalization & Name Recognition
1. **Dynamic Name Greeting**:
   - In widget header and empty state: *"Good morning, Candace"* / *"Welcome back, Candace"*.
   - Mya never treats the user as an anonymous visitor.
   - Context carries `userName`, `firstName`, `hairType`, `porosity`, and `currentStreak`.
2. **Durable Profile Memory**:
   - Remembers past hair challenges (e.g. *"Last week you mentioned crown breakage — how has the protective styling been feeling?"*).

### 4.2 The Uncluttered "Mya Hub" Action Drawer (`＋` Menu)
Instead of overwhelming the interface with dozens of buttons, the composer drawer provides **5 High-Frequency Superpowers**:
1. 🎯 **My Goals**: Quick glance at progress (e.g. Length retention 68%) + 1-tap progress log.
2. 📋 **Today's Regimen**: Morning & night checklist with quick checkmark toggle.
3. 📷 **Document Your Journey**: Visual progress photo staging (tagged as Journal entry, Length check, or Milestone).
4. 🌿 **Product Match & Ingredient Check**: Quick question asking if a product suits their specific porosity and hair type.
5. 💬 **Past Conversations**: Browse past discussions or launch a fresh session without cluttering the stream.

### 4.3 Page-Aware Context & Proactive 1-Tap Page Actions
Mya continuously inspects the active route and contextualizes her starter pills and guidance:

| Page Route | User Intent | Mya's Ambient Header Pill | Proactive 1-Tap Action Chips |
| :--- | :--- | :--- | :--- |
| `/today` | Daily habit tracking | `● Today Hub` | • *"What's my wash day checklist?"*<br>• *"Log 10-second scalp check-in"*<br>• *"Check my daily hydration streak"* |
| `/goals` | Goal evaluation & milestones | `● Goals` | • *"Review my length retention target"*<br>• *"How do I reach 14 inches by Dec?"*<br>• *"Adjust my goal target date"* |
| `/routine` | Wash day & treatment steps | `● Routine` | • *"Walk me through wash day step-by-step"*<br>• *"Why is steam cap conditioning essential?"*<br>• *"Mark deep conditioning complete"* |
| `/journal` | Progress reflection | `● Journal` | • *"📷 Document wash day photo"*<br>• *"Record length check measurement"*<br>• *"Help me write today's journal note"* |
| `/community` | Social inspiration | `● Community` | • *"What styles are trending for 4A hair?"*<br>• *"Share my wash day milestone"* |
| `/profile` | Scientific strand DNA | `● Strand DNA` | • *"Explain my porosity & elasticity"*<br>• *"Book 1-on-1 stylist consultation"* |

### 4.4 Daily Habit Loops: What Makes Users Come Everyday?
1. **Daily Hair Weather & Environmental Advisory**:
   - Fetches local humidity and UV index:
   - *"Atlanta humidity is 78% today (Frizz Alert) — Mya recommends sealing with a light oil like jojoba before heading out."*
2. **Consistency Streak Counter**:
   - *"🔥 5-Day Hair Care Consistency Streak!"* Celebrating daily micro-wins creates immense habit retention.
3. **Wash Day Countdown & Restock Anticipation**:
   - *"Wash Day in 2 days — time to check your deep conditioner supply."*
4. **10-Second Micro-Check-ins**:
   - One-tap quick response chips for scalp mood (*"Feeling hydrated"*, *"Dry"*, *"Itchy"*) that automatically append to their Journal.

---

## 5. Cross-Repo Synchronization Procedure

When an agent makes updates to shared components:

1. **Widget Updates**:
   - Primary authoring in `Myavana-Chatbot/packages/widget/src/myavana-widget.js`.
   - Synchronize directly to `myavana-hair-journey-next/assets/js/myavana-widget.js`.
   - Validate syntax with `node --check` across both locations.
2. **REST Route Updates**:
   - Document any new parameters in this file under **Changelog**.
   - Ensure `RestController.php` supports `X-On-Behalf-Of` for internal service impersonation.
3. **Dashboard Schema Alignment**:
   - Ensure any new database columns in PostgreSQL have corresponding migrations in `packages/core/migrations`.

---

## 6. Active Changelog & Agent Logbook

| Date | Agent | Component | Summary of Changes |
| :--- | :--- | :--- | :--- |
| **2026-09-04** | **Astra (AI Lead)** | `aiCore.js`, `index.js` | Added `transcribeAudio` (`gemini-3.5-transcribe`) and Live Voice commit handler. |
| **2026-09-04** | **Astra (AI Lead)** | `myavana-widget.js` | Built Gemini Live Voice modal overlay (`.mya-live-overlay`) with Web Audio fluid orb and acoustic barge-in. |
| **2026-09-04** | **Astra (AI Lead)** | `mya-widget-embed.js` | Added `startLiveVoice()` and `endLiveVoice()` bridge exports on `MyavanaNext.Mya`. |
| **2026-09-04** | **Astra (AI Lead)** | `conversation.js`, `index.js` | Added conversation history management (`/conversations`, `/conversations/:id`, `/conversations/new`) and hardened fallback chain with `gemini-2.5-flash`. |
| **2026-09-04** | **Astra (AI Lead)** | `AGENT_COLLABORATION_HUB.md` | Formalized agent identity as **Astra (Lead AI Systems Architect)** and established Everyday Assistant retention blueprint. |

| **2026-09-04** | **Agent 2 (WordPress SoR)** | `AGENT_COLLABORATION_HUB.md` | Joined the hub. Audited the full WP↔Mya integration surface and filed 6 blocking integration gaps in §8. |

| **2026-09-04** | **Agent 2 (WordPress SoR)** | `myavana-widget.js`, `mya-widget-embed.js`, `app.js` | Rebuilt Stories & Profile on real WP records via a new local-platform bridge (`registerLocalPlatform`); fixed hash-route page awareness. See §9. |

| **2026-09-04** | **Agent 2 (WordPress SoR)** | `myavana-widget.js` | Polished Chat & History: turn grouping, real timestamps & day rules, list-aware markdown, streaming caret, copy, recency-bucketed history. See §10. |

---

## 7. How to Communicate with the Human & Community

- When proposing changes that touch multiple repositories, reference the affected sections in this document.
- Keep documentation updated after every major capability addition.
- Flag any blocking external issues (e.g. browser driver limitations) early with clear alternative verification paths.

---

## 8. Open Integration Gaps — filed by Agent 2 (WordPress System of Record), 2026-09-04

Verified against `myavana-hair-journey-next` @ `5a83df4` and `Myavana-Chatbot` working tree.
Contracts that **do** line up: `X-Myavana-Service-Key` (`Permissions::hasValidServiceKey`, default
`myavana_secret_service_key_2026`) matches `wordPressHairJourneyProvider.js`; `X-On-Behalf-Of`
resolution in `RestController::getUserId()` matches the provider's impersonation header; the
`myavana/v1` route set covers every path the provider calls (`/profile`, `/goals`, `/routine`,
`/routine/toggle-step`, `/today`, `/journal/entries`). Widget bytes are identical across both repos.

### G1 — Every in-app chat CTA still opens Kommunicate, not Mya  *(owner: Agent 2)*
`.btn-open-kommunicate` in `nav-header.php:68`, `site-footer.php:38`, `today.php:39,133` and
`luxury-home.php:379` all route through `app.js:152` → `MyavanaNext.Kommunicate.open()`.
Mya is reachable *only* via her own floating bottom-left bubble. §4.3's page-aware entry points
cannot fire from any first-party CTA. Decision needed from Winston: keep the A/B split, or
repoint the named CTAs ("Ask an expert", "Chat with Mia") at `MyavanaNext.Mya.open()`.

### G2 — `chatToken` is minted but never verified  *(owner: Agent 1)*
`AuthRoutes::getChatToken()` mints an HMAC token (`base64(payload).hmac`, 300s TTL,
`MYAVANA_CHAT_SECRET` or `wp_salt('auth')`) and the embed adapter pushes it into widget context.
`grep chatToken packages/` in `Myavana-Chatbot` returns **zero hits** — the AI core never
validates it. Identity today rests entirely on the shared service key plus a client-supplied
`wpUserId`, which means a caller can impersonate any WP user. The token is the intended fix;
it needs a verifier on the Node side.

### G3 — Page-context mapping doesn't match the SPA's actual routes  *(owner: Agent 2)*
`mya-widget-embed.js` maps on `/goals`, `/routine`, `/today`, `/journal` pathnames and on
hashes `#routine`, `#today`, `#journey`. The shell is single-page with
`validTabs = ['home','today','journey','routine','community','profile']` (`app.js:12`) and
navigates by `history.pushState('#'+tab)` (`app.js:91`). Consequences:
- `#profile` and `#community` never set a `view`, so §4.3's Strand DNA and Community pills are dead.
- `pushState` does **not** fire `popstate`, so tab changes inside the app never reach
  `handleLocationChange()` — Mya's context goes stale after the first navigation.
Fix on the WP side: call `MyavanaNext.Mya.setPageContext()` directly from `navigate()` and map
the six real tab names.

### G4 — `chatApiBase` defaults to `http://localhost:8080` in production  *(owner: Agent 2)*
`Assets.php:256` falls back to localhost unless `MYAVANA_CHAT_API_BASE` is defined or the
`myavana_next_chat_api_base` option is set. The deployed Cloud Run service is
`https://myavana-ai-bot-fulfillment-6cn2pod4ta-uc.a.run.app`. Any environment missing that
constant silently ships a widget that cannot reach Mya. Needs an admin setting + a non-localhost
production default.

### G5 — Identity linking silently degrades to "trust the caller"  *(owner: Agent 1 / Agent 3)*
`hairJourneyService.resolveWordPressUserId()` returns `1` for a falsy id and, on any Postgres
error or missing `identity_links` row, returns the incoming `myavanaUserId` unchanged as if it
were a WP user id. Combined with G2 that turns a DB blip into cross-account data exposure —
and `wordPressHairJourneyProvider._request()` swallows every failure into fallback data, so
neither side surfaces the miss. Read-after-write verification (Principle 3) can report
`✓ Synced` against the wrong account.

### G6 — Live credentials committed to `Myavana-Chatbot/chat_log.md`  *(owner: Winston, urgent)*
That file contains a full Cloud Run service manifest including the production `DB_PASSWORD`,
Redis Cloud password, `GENKIT_API_KEY`, a live `OPENAI_API_KEY` and `XAI_API_KEY`. These should
be treated as compromised: rotate all five, then purge the file from history.

### Suggested sequencing
1. **G6** now (rotate + purge) — independent of everything else.
2. **G2 + G5** together — one identity fix; nothing else about trust is real until it lands.
3. **G4**, then **G3**, then the **G1** decision — these are the visible "polish" wins and G1
   is the one that actually puts Mya in front of users.


chat_log.md - is a local file never to be pushed to github...we will rotate at end of dev

---

## 8. Platform-Adaptive Architecture: Global Core vs. Local Platform Extensions

### 8.1 Core Architectural Philosophy
Mya is designed not as an isolated third-party chat bubble, but as a **native AI companion embedded naturally into each host platform**.

To achieve this while preventing code bloat and maintaining a simple, high-performing integration:
1. **Global Myavana Functionalities**: Universal capabilities that exist identically everywhere Mya is deployed (WordPress, Shopify, Consumer Web, Salon Pro portal, Mobile App / React Native SDK).
2. **Local Platform Extensions**: Surface-specific features directly hooked into the host platform's native records, DOM, and UI workflows. Local features are never forced onto platforms where they don't belong, and they keep host data management simple without unnecessary backend sync overhead.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      MYAVANA WIDGET & SDK CORE                          │
├─────────────────────────────────────────────────────────────────────────┤
│  GLOBAL CORE CAPABILITIES (Universal across all surfaces)               │
│  • Streaming AI Workspace (/chat/stream)                                │
│  • Gemini Live Web Audio Voice Orb (/chat/live/commit)                  │
│  • Multi-Turn Conversation History Archive (/conversations)             │
│  • Voice Dictation & Audio Transcription (/audio/transcribe)            │
│  • Universal Hair Science Knowledge & Regimen Taxonomy                  │
│  • Luxury Brand Design Tokens, Icons & Mobile-First Layout             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────────────┐
│ LOCAL PLATFORM EXTENSION:             │   │ FUTURE PLATFORM EXTENSIONS:         │
│ WordPress Hair Journey (myhairjourney)│   │ (E-Commerce, Salon Pro, Mobile)     │
│ • Stories Tab (Photo timeline reel)   │   │ • Shopify: Cart Drawer / Orders     │
│ • Profile Card (Strand DNA / HairID)  │   │ • Salon Pro: Client Appointments    │
│ • Journal Entries (Wash days, checks) │   │ • Mobile SDK: Native Camera/Health  │
│ • Goals & Regimen Routines            │   │ • Standalone Web: Core Chat Only    │
└───────────────────────────────────────┘   └─────────────────────────────────────┘
```

---

### 8.2 Boundary Matrix: Agent 1 (Widget/SDK Lead) vs. Agent 2 (Hair Journey Site Lead)

| Component | Layer | Owner | Scope & Responsibility |
|:---|:---|:---|:---|
| **Chat Workspace** | Global Core | **Agent 1** | Streaming responses, generative UI cards, markdown rendering, tool calling. |
| **Live Voice Session** | Global Core | **Agent 1** | Gemini Live voice commit, Web Audio orb, barge-in detection, speech-to-text. |
| **History Archive** | Global Core | **Agent 1** | Multi-turn past conversations, search, and new session creation. |
| **Stories Tab** | Local Extension | **Agent 2 (Site Plan) + Agent 1 (Bridge)** | Hair Journey photo reel, wash day entries, milestone cards. **Only rendered on WP Hair Journey**. |
| **Profile Card / Modal** | Local Extension | **Agent 2 (Site Plan) + Agent 1 (Bridge)** | Verified Strand DNA (HairID), HHCP badge, active goals, routines, quick actions. |
| **Native Entry Composer**| Host Platform | **Agent 2** | WordPress modal/view for creating new journal entries with photos and tags. |
| **Identity & Routing** | Host Platform | **Agent 2** | Passing `chatToken`, `wpUserId`, and route changes (`syncRoute`) from WP SPA shell. |

---

### 8.3 JavaScript Platform Adapter Contract (`registerPlatformAdapter`)

Agent 2's client integration (`assets/js/modules/mya-widget-embed.js`) registers the host platform adapter into `MyavanaWidget`.

```javascript
// Example: Registering the WordPress Hair Journey Adapter
window.MyavanaWidget.registerPlatformAdapter({
    name: 'Myavana Hair Journey',
    platform: 'wordpress',
    
    // 1. Primary Aggregate Data Provider
    // Returns Promise resolving to the user's Hair Journey record
    getJourney: function () {
        var nonce = (window.myavanaNextData && window.myavanaNextData.nonce) ||
                    (window.myavanaSettings && window.myavanaSettings.nonce) || '';
        return fetch('/wp-json/myavana/v1/profile', {
            headers: { 'X-WP-Nonce': nonce }
        }).then(res => res.json()).then(res => res.data || res);
    },

    // 2. Native Entry Composer Trigger
    // Called when user clicks "+ Add Entry" in the Stories tab or Profile quick action
    openEntryComposer: function () {
        if (window.MyavanaNext && window.MyavanaNext.SmartEntry && window.MyavanaNext.SmartEntry.open) {
            window.MyavanaNext.SmartEntry.open(); // opens full modal with real hair metadata
            return;
        }
        if (window.MyavanaNext && window.MyavanaNext.App && window.MyavanaNext.App.navigate) {
            window.MyavanaNext.App.navigate('journey');
        }
    },

    // 3. In-App Navigation Bridge
    // Called when user taps a goal, routine, or entry card in Mya
    navigate: function (tab, params) {
        MyavanaNext.App.navigate(tab);
        if (params && params.entryId) {
            setTimeout(function () {
                var el = document.querySelector('[data-entry-id="' + params.entryId + '"]');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
});
```

---

### 8.4 Data Contract Schemas for Agent 2

#### A. Stories Tab Record Schema (`entries` array inside `getJourney()` response)
```typescript
interface JourneyEntry {
    id: number | string;
    title: string;
    date: string;               // ISO or "YYYY-MM-DD HH:mm:ss"
    entryType: 'wash_day' | 'length_check' | 'milestone' | 'quick_checkin' | 'treatment' | 'protective_style';
    moistureLevel?: number;     // 1 to 5
    mood?: string;              // e.g. "Confident", "Dry", "Hydrated"
    hairLength?: string;        // e.g. "12.5"
    hairLengthPoint?: string;   // e.g. "Crown", "Nape", "Sides"
    scalpState?: string;        // e.g. "Clean", "Dry", "Flaky"
    notes?: string;             // User notes
    photos?: string[];          // Array of image URLs
    productsUsed?: string[] | { name: string }[];
}
```

#### B. Profile Tab Record Schema (`profile` and `stats` inside `getJourney()` response)
```typescript
interface HairJourneyProfile {
    displayName: string;
    avatarUrl?: string;
    hairJourneyStage?: string;  // e.g. "Transitioning to Natural", "Natural 5+ Years"
    completionPercentage?: number; // 0 to 100
    
    // Strand DNA / HairID
    hairType?: string;          // e.g. "Type 4C (Coily)"
    porosity?: string;          // e.g. "Normal Porosity", "High Porosity"
    density?: string;           // e.g. "High Density", "Medium Density"
    length?: string;            // e.g. "12"
    concerns?: string[];        // e.g. ["Crown Breakage", "Dryness"]
}

interface HairJourneyStats {
    currentStreak: number;
    longestStreak?: number;
    level?: number;
    levelTitle?: string;        // e.g. "Moisture Master"
    totalPoints?: number;
    nextLevelPoints?: number;
}
```

#### C. Goals & Routines Schema (`goals` array inside `getJourney()` response)
```typescript
interface JourneyGoal {
    id: number | string;
    title: string;              // e.g. "Retain 4 Inches Length by Dec 2026"
    progress: number;           // 0 to 100
    category?: string;          // e.g. "Retention", "Hydration"
    target_date?: string;       // e.g. "2026-12-31"
    status?: 'active' | 'completed';
}
```

---

### 8.5 SDK Synchronization Methods Available to Agent 2

| Method | Description | When Agent 2 Should Call It |
|:---|:---|:---|
| `MyavanaWidget.registerPlatformAdapter(adapter)` | Registers host platform methods (`getJourney`, `openEntryComposer`, `navigate`). | On app boot after authentication is established. |
| `MyavanaWidget.setContext(context)` | Updates host context: `page`, `route`, `wpUserId`, `userName`, `streak`. | On initial load and user authentication. |
| `MyavanaWidget.refreshJourney()` | Invalidates cached journey data and re-pulls from host platform. | After user saves/updates a journal entry, goal, routine, or profile trait. |
| `MyavanaWidget.switchView(viewName)` | Switches active view: `'chat'`, `'stories'`, `'history'`, `'profile'`. | When user triggers Mya shortcuts from site navigation or quick action buttons. |
| `MyavanaWidget.setCapabilities(caps)` | Enables/disables capabilities: `{ stories: true/false, profile: true/false }`. | To dynamically toggle local tabs (e.g. guest mode vs. authenticated member). |
| `MyavanaWidget.open()` / `close()` | Opens or closes the floating companion workspace. | From any external banner, CTA, or trigger button on the WordPress site. |
| `MyavanaWidget.sendMessage(prompt)` | Automatically populates composer and triggers streaming query. | When user clicks "Ask Mya about this" on an entry or goal in the WP site. |

---

## 9. Local Platform Bridge — shipped by Agent 2, 2026-09-04

Resolves **G3** in full and reshapes how host-specific surfaces work. Widget synced
byte-identical to `myavana-hair-journey-next/assets/js/myavana-widget.js`.

### 9.1 The global / local split
Chat, Live Voice and History are **global** MYAVANA capabilities and run on any surface.
Stories and Profile are **local**: they render the host platform's own records and now only
exist when that host registers a provider. A surface that registers nothing (shop, marketing
site) simply never sees those tabs, and `switchView('stories'|'profile')` falls back to Chat.

```js
MyavanaWidget.registerLocalPlatform({
  name: 'Myavana Hair Journey',
  getJourney: () => Promise<JourneyRecord>,   // required
  openEntryComposer: () => void,              // optional
  navigate: (tab, params) => void             // optional
});
MyavanaWidget.refreshJourney();               // force a re-pull
```

`JourneyRecord` is the existing `GET /wp-json/myavana/v1/profile` payload unchanged —
`profile`, `stats`, `badges`, `entries`, `totalEntries`, `goals`, `goalsOverview`, `routines`,
`analytics`, `dayCount`, `joinDate`, `currentLength`, `lengthGain`, `hairIdNote`. One round
trip serves both tabs; the adapter caches it 60s and drops the cache when SmartEntry saves.

### 9.2 No fabricated data, anywhere
The old Stories tab shipped three hardcoded entries with Unsplash stock photography, and
Profile fell back to a fictional "Candace Harris / Type 4C / Normal Porosity" whenever its
fetch failed — which was **always**, because it called WordPress with no `X-WP-Nonce` and
silently took the 401. Every member saw the same invented hair profile. All of it is gone:

- Stories renders real journal entries — real photos, entry types, moisture, mood, scalp
  state, length readings, products — grouped by real month, with a photo reel drawn only from
  entries that actually have a photo.
- Profile renders the real strand record. **Unset traits show `+ Add` and deep-link into the
  profile editor rather than displaying a plausible guess** — a wrong porosity here would
  poison every regimen answer Mya gives.
- Empty, error and signed-out states are explicit (with Retry), never filled with sample content.
- History's offline fallback no longer invents three conversations the member never had.

### 9.3 Page awareness (G3 closed)
`currentRoute()` resolves `home | today | journey | routine | community | profile` from the
host context first, then the URL hash (`https://myhairjourney.ai/#routine`). The stale default
`view: 'home'` in widget state was shadowing the hash on cold load and is removed.
`app.js navigate()` now calls `MyavanaNext.Mya.syncRoute(tab)` — `pushState` fires neither
`hashchange` nor `popstate`, so this was the actual reason context went stale after the first
tab change. All six routes carry their own context pill label and starter pills.

### 9.4 Also fixed
`ProfileRoutes::getProfile()` computed `avgHealthScore` from `$entry['healthRating']`, a field
journal entries have never had — it was `0` for every member on every request. Now reads the
real `moistureLevel`.

### 9.5 Verification
43 assertions across three jsdom suites, all passing: real-data rendering, entry detail
gallery, empty/error/signed-out states, off-platform tab hiding, cold-load hash routing,
`pushState` route sync, and REST envelope unwrapping with the nonce attached.

### 9.6 Still open for other agents
**G1** (every named chat CTA still opens Kommunicate, so Mya remains reachable only from her
own bubble) is a product decision for Winston. **G2/G5** (chatToken never verified;
`resolveWordPressUserId` trusts the caller on DB error) and **G6** (live credentials in
`chat_log.md`) are unchanged and still the priority.

---

## 10. Chat & History Polish — Agent 2, 2026-09-04

Widget-wide look-and-feel pass, synced byte-identical to the plugin copy. 94 assertions
across seven jsdom suites, all passing.

### 10.1 Chat
- **Turn grouping.** Consecutive turns from one speaker print the name row once and tuck
  their bubbles together (`.grouped` squares the seam). A four-turn thread now renders two
  headers instead of four; anything between turns — a card, checklist or status pill —
  correctly breaks the run.
- **Real timestamps and day rules.** Each turn carries its own clock time. A resumed thread
  recovers the ISO stamp already embedded in stored user turns, so it shows *when the
  conversation happened* rather than the moment it was reopened, with Today/Yesterday/weekday
  separators where it crosses days.
- **List-aware markdown.** The old parser handled bold, italic, code and blockquote only, so
  ordered and bulleted lists — most of what hair guidance actually looks like — leaked as
  literal `1.` and `- ` inside a paragraph. Now: `ol`/`ul` with coral markers, `h3`/`h4`,
  `hr`, and safe `[text](url)` links. Still escape-first.
- **Streaming feel.** A blinking caret tracks the tail; the thinking pill uses three animated
  dots (no telemetry text); the send button goes busy with the placeholder reading "Mya is
  replying…"; and autoscroll now respects a reader who has scrolled up to re-read.
- **Copy** on every finished reply, with clipboard fallback for non-secure contexts.

### 10.2 History
- **Recency buckets from real timestamps**: Today / Yesterday / Previous 7 Days /
  Previous 30 Days / Earlier, with relative times ("2h ago"). Every row previously read
  "Recent" regardless of age.
- **Richer rows** — icon, title, pluralised message count, relative time, chevron — with the
  active conversation marked **Current**.
- **Search** gains a clear button, collapses emptied group headings, and has a real no-match
  state. Skeleton rows cover the load so the panel never flashes empty.

### 10.3 Chrome
Refined bubbles and shadows, gradient stream ground, styled scrollbars, spring-eased quick
reply pills, a glass jump-to-latest control, an animated nav underline, a slow breathing
launcher halo, `:focus-visible` outlines throughout, and an extended `prefers-reduced-motion`
block covering every new animation.

---

## 11. WordPress Endpoint Reference — maintained by Vela ✧ (Agent 2)

Canonical field list for anyone consuming the WordPress System of Record. Added after `routines`
was left out of a field list I gave @Iris and Customer 360's routine tab was nearly shipped
permanently empty as a result. **If you consume these, read this section, not a chat message.**

All routes are under `/wp-json/myavana/v1/`, all call `RestController::getUserId()`, and all
therefore honour service-to-service impersonation:
`X-Myavana-Service-Key: <MYAVANA_SERVICE_KEY>` + `X-On-Behalf-Of: <wp_user_id>`.
Browser callers use `X-WP-Nonce` instead. Every response is wrapped `{ success, data: {...} }`.

### `GET /profile` — the aggregate journey record (one round trip)
| Key | Notes |
|:---|:---|
| `profile` | `displayName`, `avatarUrl`, `hairType`, `porosity`, `density`, `length`, `concerns[]`, `hairJourneyStage`, `completionPercentage`, `missingFields[]`, `measurementUnit` |
| `stats` | `currentStreak`, `longestStreak`, `totalPoints`, `totalCheckins`, `level`, `levelTitle`, `nextLevelPoints` |
| `badges` | `{ id, name, description, icon, unlocked }` — **includes locked ones**; filter on `unlocked` |
| `entries` / `totalEntries` | Journal entries. `photos[]` are **absolute URLs, never IDs**, and are legitimately **empty** for text-only entries |
| `goals` / `goalsOverview` | `goalsOverview` splits into `active[]` / `completed[]` with counts |
| **`routines`** | `{ id, title, category, frequency, description, steps[{id,name,duration,products}], products[] }`. Legacy shapes are normalised on the way out |
| `analytics` | `totalEntries`, `currentStreak`, `avgHealthScore`, `topMood`, `monthlyCounts`, `progressScore` |
| `dayCount`, `joinDate` | Day count mirrors Today/Timeline's calculation |
| `currentLength`, `lengthGain` | From logged length-check readings. **`null` when fewer than 2 readings exist** — absent, not zero |
| `hairIdNote` | Templated reading of the member's own stored traits. **Not** a CNN/HairAI™ analysis |
| `milestones`, `community`, `healthScore` | Milestone-tagged entries with photos; community stats/posts |

### `GET /today` — the daily hub
`greeting`, `dayCount`, `user`, `hasRoutineSteps`, `checklist`, `latestEntry`, `recentEntries`,
`insight`, `routineProducts`, `week`, `goals`, `upcomingGoals`, `memory`.

`checklist` = `{ date, items[{id, routineTitle, category, name, duration, products, isCompleted}],
completedCount, totalCount, completionPercent }`.

### `GET /routine` — routines + product cabinet, without the rest of the profile payload
Also: `POST /routine/toggle-step`, `GET /routine/cabinet`.

### ⚠️ Three traps in this data
1. **`completionPercent` is `0` when `totalCount` is `0`** — indistinguishable from "has a routine,
   completed none of it". Use `hasRoutineSteps` to separate them, or a member with no routine reads
   as 0% compliant.
2. **`currentLength` / `lengthGain` are `null`, not `0`,** when there aren't two readings to compare.
   Rendering `null` as `0` invents a plateau that never happened.
3. **`checklist.date` comes from WordPress `current_time()`** — the site's day, not the viewer's.
   Correct for matching what the member sees; label it rather than rendering as the operator's today.

These share a shape with the `healthRating` bug (§9.4): a real absence rendered as a confident
zero. When a field can be legitimately absent, say absent.

— **Vela** ✧

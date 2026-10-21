# Changelog

## 1.3.0 (unreleased, TASK-008 M1 + M2)
### M2: the SDK owns the UI
- New entry `@myavana/react-native-sdk/ui`: `MyaChat` (screen body) and its building blocks, promoted unchanged-in-behaviour from the app's Mya UI (composer, message row, markdown, welcome, thinking dots, sheet, history sheet, keyboard hook, rich-block registry and cards).
- Host specifics (navigation, context, camera and picker, extra menu items, extra modals) come in as props; the app keeps only glue.
- `MyaThemeProvider` / `useMyaTheme` with MYAVANA as the default (a seam, not a multi-brand system).
- One block registry. `product`, `product_list` and `product_card` are suppressed on purpose (MYAVANA sells services). Unknown types render a generic card, never a blank. A contract test fails if a type the server emits is neither rendered nor suppressed; it found `divider` unregistered, now fixed.
- Profile metrics with no value read "Not yet analysed" instead of rendering 0.
- Ported from the web widget: per-day checklist persistence, day separators, long-press copy, "Reply stopped" and per-kind error copy on messages, scroll anchoring with a "Latest" pill.
- The attach sheet no longer offers "Analyse a hair strand" (the app does no hair analysis; HairAI is the service).
- **Removed:** the old SDK UI (`MyaChatView`, `MyaChatBubble`, `MyaBlockRenderer`, `MyaStrandCard`, `MyaRoutineChecklist`, `MyaGoalCard`, `MyaJournalCard`, `MyaConsultationCard`, `MyaMediaCard`, `MyaProductCard`, `MyaQuickReplies`, `MyaFloatingTrigger`, `defaultMyaTheme`). `MyaStrandCard` invented values (`?? 88`); `MyaProductCard` showed products.
- Package hygiene: `files`, `types`, `ui.d.ts`, declared peer dependencies, README, devDependencies, `npm test` runs headless and UI suites.

### M3: service offers
- `service_offer` card (`ServiceOfferCard`) built to the proposed contract against fixtures: store name, server price or none, up to 3 inclusions, a reason from the member's HairID, one primary action, a quiet "Not now". Renders nothing when malformed, owned, dismissed, or the host cannot fulfil its route.
- Routing is the host's: `onOpenPaywall` (native purchase; outcome read back from the server) and `onOpenLink` (in-app browser, links tagged `utm_source=mya&utm_medium=chat&utm_campaign=app&utm_content=<service>`). Links must be https on myavana.com or calendly.com.
- Funnel events through the existing `POST /events` (`offer_shown`, `offer_tapped`, `offer_dismissed`, `paywall_opened`, `purchase_completed`, `purchase_cancelled`, `link_opened`, `consult_booking_opened`), each with `surface:'app'`, `service`, `offer_id`, `price_shown`, `framing_variant`; mirrored through the `analytics` prop.
- `experienceContext.entitlements` is sent on every turn (`client.setEntitlements`); owned services are never offered.
- "Not now" is remembered per offer and never re-shown from the cached thread.
- Post-purchase moment: a confirmed purchase opens Mya's next turn with a short, fixed celebration and an offer to walk through it.

### M1
- **Fix:** photos now reach the model. Attachments are normalised to inline `data:image/…;base64,` or `https://`; `file://` and other unreadable assets are rejected before any request, so the UI can no longer claim a photo was sent. Max 4 per message.
- **Fix:** the host's `userId` always wins over a stored one; a different stored user's conversation is not inherited. New `clearSession()` (client and hook) for logout.
- **Fix:** no staging fallback. A missing `apiBase` throws in dev and reports a `config` error in production.
- Hook-level in-flight guard: two sends in one tick make one request.
- Error taxonomy (`offline | timeout | server | auth | aborted | attachment | config | unknown`) with distinct user copy; `error.kind` and `error.userMessage` on every surfaced failure.
- A turn that fails before Mya says anything is removed from the thread and returned as `unsentDraft`; partial replies are kept and marked `interrupted`.
- Stream silence timeout (default 45 s) and 15 s timeouts on history and journal fetches.
- Types: `MyaError`, `UnsentDraft`, `normalizeAttachments`, `classifyError`.
- Fixed the stale route-sync test.

## 1.2.0
- Initial published version.

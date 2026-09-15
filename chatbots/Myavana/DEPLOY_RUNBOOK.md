# Deploy runbook — isolated staging service for Candace's E2E test

**Status as of 2026-09-04: NO-GO.** Four independently verified blockers, all in §1.
This runbook exists so that when the gates clear, the deploy is mechanical rather than improvised.

Prepared by **@Atlas ⏣**. Canonical decision record:
`community/threads/005_isolated_cloudrun_test_readiness.md`.

---

## 1. Gates — every one must be green before §3

Do not proceed on a partially-green list. Each of these was measured, not assumed.

| # | Gate | Status | Owner | How to confirm it's clear |
|:--|:---|:---|:---|:---|
| 1 | **Gemini billing tier** | ❌ blocked | Winston | Free tier is 20 req/day/model; measured `429` on 2026-09-04. One user turn costs several requests. Confirm with the live check in §2. |
| 2 | **Public WP host** | ❌ blocked | Vela / Winston | `WORDPRESS_API_BASE` must resolve from outside this laptop. `.local` is unreachable from Cloud Run. |
| 3 | **Fresh service key** | ❌ blocked | Winston | A *new* value on the isolated pair. Do not reuse the string in the working trees. |
| 4 | **`gcloud` access** | ❌ blocked | Winston | Not installed on the build machine; someone with gcloud runs §3. |
| 5 | Widget source committed | ⚠️ check | Winston | Working tree ahead of HEAD as of writing. Deploy from a committed SHA only. |
| 6 | Local E2E gate green | ⚠️ partial | Atlas | Provider verified against real WP data; full chat path unverifiable while gate 1 is red. |

**Why gate 1 outranks the rest:** the others produce a degraded test. Gate 1 produces no test at
all — the model returns `429` and Mya goes silent mid-conversation.

---

## 2. Pre-flight (run these, don't assume)

```bash
# Model actually answers — this is gate 1, and it is the one that has been failing
node -e "require('myavana-bot-test-core/src/ai').chat({model:'gemini-2.5-flash'})\
  .send('say OK').then(r=>console.log('✅',r.text)).catch(e=>console.log('❌',e.message))"

# WP host is reachable from somewhere that isn't this laptop
curl -s -o /dev/null -w "%{http_code}\n" "$WORDPRESS_API_BASE/wp-json/myavana/v1/app/init"

# Service key is set on BOTH sides, and is NOT the exposed literal
grep -q "MYAVANA_SERVICE_KEY" /path/to/wp-config.php && echo "wp: set" || echo "wp: MISSING"

# Deploying a committed SHA, not a dirty tree
git status --porcelain packages/ | grep . && echo "⚠️ DIRTY — commit first" || echo "clean"
```

---

## 3. Deploy (requires gcloud)

```bash
export PROJECT_ID=myavana-ai-chatbot
export REGION=us-central1
export GIT_SHA=$(git rev-parse --short HEAD)

# 3a. Secrets — isolated from production's `myavana-secrets`
gcloud secrets create myavana-staging-secrets --project "$PROJECT_ID" 2>/dev/null || true
# populate each key referenced in service-staging.yaml

# 3b. Build. Tag with the SHA — never :latest.
#     (:latest is how you deploy a cached blob from four Tuesdays ago and
#      spend an afternoon debugging code that isn't running.)
gcloud builds submit --tag "gcr.io/$PROJECT_ID/myavana-chatbot-staging:$GIT_SHA" .

# 3c. Deploy
sed -e "s|PROJECT_ID|$PROJECT_ID|" -e "s|GIT_SHA|$GIT_SHA|" \
  service-staging.yaml > /tmp/service-staging.resolved.yaml
gcloud run services replace /tmp/service-staging.resolved.yaml \
  --region "$REGION" --project "$PROJECT_ID"

gcloud run services describe myavana-chatbot-staging \
  --region "$REGION" --format='value(status.url)'
```

---

## 4. Smoke test before Candace touches it

```bash
STAGING_URL=<url from 3c>

curl -s "$STAGING_URL/health"                      # expect: initialized true

# The one that matters — a Hair Journey tool round trip end to end.
# If this returns "you don't have any goals" for a user who HAS goals,
# stop. That is the open correctness issue, not a data problem.
curl -s -N -X POST "$STAGING_URL/chat/stream" \
  -H 'Content-Type: application/json' \
  -d '{"message":"What are my current hair goals?","from":"<WP_USER_ID>","groupId":"smoke-1"}'
```

Verify independently that the answer matches the provider:

```bash
curl -s -H "X-Myavana-Service-Key: $WORDPRESS_SERVICE_KEY" \
     -H "X-On-Behalf-Of: <WP_USER_ID>" \
     "$WORDPRESS_API_BASE/wp-json/myavana/v1/goals"
```

**Both must agree.** A confident answer that contradicts the record is the failure mode this
project has been fighting all day, in both directions — inventing presence (Candace Harris) and
inventing absence (the open goals issue). Neither is acceptable in front of Candace.

---

## 5. Rollback

Nothing to roll back — this service is new and isolated. If it misbehaves:

```bash
gcloud run services delete myavana-chatbot-staging --region "$REGION"
```

Production is untouched by construction: different service name, different secret store, no traffic
split. That isolation is the point, and it is why this is worth doing as a separate service rather
than a revision of the live one.

---

## 6. Widget sync (blocked pending ownership decision — @Astra)

The widget bundle is copied by hand between `packages/widget/src/` and the plugin's `assets/js/`.
This has clobbered a day's work **twice** in one day, once restoring the fabricated Candace Harris
fallback data into the tree.

When ownership is settled, the sync script must:

1. Treat the plugin copy as a **build output** — never edited, never committed. Two tracked copies
   is the mechanism that caused the divergence, not the cure for it.
2. **Refuse to sync** if the destination has uncommitted changes the source lacks (@Vela — this is
   the exact case that ate the work both times).
3. Gate on `tests/run.sh`, **non-zero exit on failure**. 116 assertions across 8 suites; catches a
   clobber in about four seconds.

A convention everyone sincerely intends to follow has now failed twice, neither time through
carelessness. Make it fail loudly instead — same principle as the fail-closed service key.

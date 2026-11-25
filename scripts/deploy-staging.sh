#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Myavana Chatbot - Isolated Cloud Run Staging Deployment
# ==============================================================================
# Deploys a dedicated staging instance ('myavana-ai-bot-staging') isolated from
# the production fulfillment service ('myavana-ai-bot-fulfillment').
# ==============================================================================

PROJECT_ID="${PROJECT_ID:-myavana-ai-chatbot}"
SERVICE_NAME="${SERVICE_NAME:-myavana-ai-bot-staging}"
REGION="${REGION:-us-central1}"
IMAGE_TAG="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "======================================================"
echo "🚀 Deploying Isolated Cloud Run Staging Service"
echo "======================================================"
echo "📍 GCP Project:    ${PROJECT_ID}"
echo "📍 Service Name:   ${SERVICE_NAME}"
echo "📍 Region:         ${REGION}"
echo "📍 Target Image:   ${IMAGE_TAG}"
echo "======================================================"

# Verify prerequisites
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: 'gcloud' CLI is not found in PATH."
  echo "Please install the Google Cloud SDK or run from an authenticated shell."
  exit 1
fi

# Database and Service Configurations
DB_HOST="${DB_HOST:-34.60.246.147}"
DB_USER="${DB_USER:-myavana}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD must be set in environment}"
DB_NAME="${DB_NAME:-myavana-dashboard-bot}"
DB_PORT="${DB_PORT:-5432}"

REDIS_HOST="${REDIS_HOST:-redis-15330.c1.us-central1-2.gce.redns.redis-cloud.com}"
REDIS_PORT="${REDIS_PORT:-15330}"
REDIS_PASSWORD="${REDIS_PASSWORD:?REDIS_PASSWORD must be set in environment}"
REDIS_USERNAME="${REDIS_USERNAME:-default}"

GENKIT_API_KEY="${GENKIT_API_KEY:?GENKIT_API_KEY must be set in environment}"
GEMINI_API_KEY="${GEMINI_API_KEY:?GEMINI_API_KEY must be set in environment}"
OPENAI_API_KEY="${OPENAI_API_KEY:?OPENAI_API_KEY must be set in environment}"
XAI_API_KEY="${XAI_API_KEY:?XAI_API_KEY must be set in environment}"

WORDPRESS_API_BASE="${WORDPRESS_API_BASE:-https://myhairjourney.ai}"
WORDPRESS_SERVICE_KEY="${WORDPRESS_SERVICE_KEY:?WORDPRESS_SERVICE_KEY must be set in environment}"

# Protects /admin/* (cache invalidation, ecosystem sync). The server rejects all
# admin requests in production without it; the Dashboard must send the same value
# as CHATBOT_ADMIN_API_KEY.
ADMIN_API_KEY="${ADMIN_API_KEY:?ADMIN_API_KEY must be set in environment}"

echo "🗺️  Refreshing the MYAVANA Ecosystem snapshot from the live map..."
node "$(dirname "$0")/sync-ecosystem-snapshot.js" || echo "⚠️  Snapshot refresh failed; deploying with the existing snapshot."

echo "🔨 Building and pushing container image via Google Cloud Build..."
gcloud builds submit --project="${PROJECT_ID}" --tag="${IMAGE_TAG}" .

ENV_VARS="NODE_ENV=production,WORDPRESS_API_BASE=${WORDPRESS_API_BASE},WORDPRESS_SERVICE_KEY=${WORDPRESS_SERVICE_KEY},DB_HOST=${DB_HOST},DB_USER=${DB_USER},DB_PASSWORD=${DB_PASSWORD},DB_NAME=${DB_NAME},DB_PORT=${DB_PORT},REDIS_HOST=${REDIS_HOST},REDIS_PORT=${REDIS_PORT},REDIS_PASSWORD=${REDIS_PASSWORD},REDIS_USERNAME=${REDIS_USERNAME},GENKIT_API_KEY=${GENKIT_API_KEY},GEMINI_API_KEY=${GEMINI_API_KEY},OPENAI_API_KEY=${OPENAI_API_KEY},XAI_API_KEY=${XAI_API_KEY},ADMIN_API_KEY=${ADMIN_API_KEY}"
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  ENV_VARS="${ENV_VARS},ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}"
fi
if [ -n "${ANTHROPIC_BACKUP_API_KEY:-}" ]; then
  ENV_VARS="${ENV_VARS},ANTHROPIC_BACKUP_API_KEY=${ANTHROPIC_BACKUP_API_KEY}"
fi
if [ -n "${CLAUDE_SONNET_MODEL:-}" ]; then
  ENV_VARS="${ENV_VARS},CLAUDE_SONNET_MODEL=${CLAUDE_SONNET_MODEL}"
fi
if [ -n "${CLAUDE_HAIKU_MODEL:-}" ]; then
  ENV_VARS="${ENV_VARS},CLAUDE_HAIKU_MODEL=${CLAUDE_HAIKU_MODEL}"
fi
if [ -n "${CLAUDE_OPUS_MODEL:-}" ]; then
  ENV_VARS="${ENV_VARS},CLAUDE_OPUS_MODEL=${CLAUDE_OPUS_MODEL}"
fi

echo "🚀 Deploying revision to Cloud Run service: ${SERVICE_NAME}..."
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --image="${IMAGE_TAG}" \
  --platform="managed" \
  --region="${REGION}" \
  --allow-unauthenticated \
  --memory="1Gi" \
  --cpu="1" \
  --timeout="300s" \
  --concurrency="80" \
  --min-instances="0" \
  --max-instances="5" \
  --port="8080" \
  --update-env-vars="${ENV_VARS}"

gcloud run services update-traffic "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --to-latest

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --project="${PROJECT_ID}" --region="${REGION}" --format='value(status.url)')

echo "======================================================"
echo "✅ Staging service deployed successfully!"
echo "🌐 URL: ${SERVICE_URL}"
echo "🧪 Healthcheck: curl -f ${SERVICE_URL}/health"
echo "======================================================"

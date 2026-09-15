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
DB_PASSWORD="${DB_PASSWORD:-higibertigibet}"
DB_NAME="${DB_NAME:-myavana-dashboard-bot}"
DB_PORT="${DB_PORT:-5432}"

REDIS_HOST="${REDIS_HOST:-redis-15330.c1.us-central1-2.gce.redns.redis-cloud.com}"
REDIS_PORT="${REDIS_PORT:-15330}"
REDIS_PASSWORD="${REDIS_PASSWORD:-OyLRjkTPuCGzQ2mNzA3Uhx5HIqWza8QC}"
REDIS_USERNAME="${REDIS_USERNAME:-default}"

GENKIT_API_KEY="${GENKIT_API_KEY:-AIzaSyBLiBl-a9AK-jKvf_NeFQmoRknUV3Z5I0s}"
GEMINI_API_KEY="${GEMINI_API_KEY:-AQ.Ab8RN6KG98D-_N6u9KjPt5C1ihzcKeaiE31aGZwmjsn-zVBThA}"
OPENAI_API_KEY="${OPENAI_API_KEY:-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}"
XAI_API_KEY="${XAI_API_KEY:-xai-sMYdIE1XDDSE90ltnZKRL8wiD9rfW55YuPIwuaiqaR8tHiJ91EUkGKUryYpFt8wzltQ8VkP0VH2W4KSu}"

WORDPRESS_API_BASE="${WORDPRESS_API_BASE:-https://myhairjourney.ai}"
WORDPRESS_SERVICE_KEY="${WORDPRESS_SERVICE_KEY:-myavana_secret_service_key_2026}"

echo "🔨 Building and pushing container image via Google Cloud Build..."
gcloud builds submit --project="${PROJECT_ID}" --tag="${IMAGE_TAG}" .

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
  --set-env-vars="NODE_ENV=production,WORDPRESS_API_BASE=${WORDPRESS_API_BASE},WORDPRESS_SERVICE_KEY=${WORDPRESS_SERVICE_KEY},DB_HOST=${DB_HOST},DB_USER=${DB_USER},DB_PASSWORD=${DB_PASSWORD},DB_NAME=${DB_NAME},DB_PORT=${DB_PORT},REDIS_HOST=${REDIS_HOST},REDIS_PORT=${REDIS_PORT},REDIS_PASSWORD=${REDIS_PASSWORD},REDIS_USERNAME=${REDIS_USERNAME},GENKIT_API_KEY=${GENKIT_API_KEY},GEMINI_API_KEY=${GEMINI_API_KEY},OPENAI_API_KEY=${OPENAI_API_KEY},XAI_API_KEY=${XAI_API_KEY}"

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --project="${PROJECT_ID}" --region="${REGION}" --format='value(status.url)')

echo "======================================================"
echo "✅ Staging service deployed successfully!"
echo "🌐 URL: ${SERVICE_URL}"
echo "🧪 Healthcheck: curl -f ${SERVICE_URL}/health"
echo "======================================================"

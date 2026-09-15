#!/usr/bin/env bash
# ==============================================================================
# Deploy Isolated Test Instance of Myavana Chatbot to Cloud Run
# ==============================================================================
set -euo pipefail

PROJECT_ID=${PROJECT_ID:-"myavana-ai-chatbot"}
SERVICE_NAME=${SERVICE_NAME:-"myavana-chatbot-staging"}
REGION=${REGION:-"us-central1"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}"

echo "============================================================"
echo "🚀 Deploying Isolated Myavana Chatbot Test Service to Cloud Run"
echo "============================================================"
echo "Project:  ${PROJECT_ID}"
echo "Service:  ${SERVICE_NAME}"
echo "Region:   ${REGION}"
echo "Image:    ${IMAGE_NAME}"
echo "============================================================"

# Build and submit image via Google Cloud Build (does not require local Docker daemon)
echo "📦 Submitting build to Google Cloud Build..."
gcloud builds submit --tag "${IMAGE_NAME}" --project "${PROJECT_ID}" .

# Deploy to Cloud Run as an isolated service
echo "🚀 Deploying isolated service to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300s \
  --concurrency 80 \
  --max-instances 10 \
  --min-instances 0 \
  --port 8080 \
  --set-env-vars NODE_ENV=production,PORT=8080

echo "✅ Isolated deployment complete!"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "🌐 Staging Service URL: ${SERVICE_URL}"
echo "🧪 Running health check..."
curl -fsS "${SERVICE_URL}/health" && echo "✅ Health check passed!"

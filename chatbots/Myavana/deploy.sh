#!/bin/bash

# Myavana Chatbot Cloud Run Deployment Script
set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
SERVICE_NAME=${SERVICE_NAME:-"myavana-chatbot"}
REGION=${REGION:-"us-central1"}
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "🚀 Deploying Myavana Chatbot to Cloud Run"
echo "📊 Project ID: ${PROJECT_ID}"
echo "📊 Service Name: ${SERVICE_NAME}"
echo "📊 Region: ${REGION}"
echo "📊 Image: ${IMAGE_NAME}"

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t ${IMAGE_NAME} .

# Push the image to Google Container Registry
echo "📤 Pushing image to GCR..."
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --timeout 300s \
  --concurrency 80 \
  --max-instances 100 \
  --min-instances 0 \
  --port 8080 \
  --set-env-vars NODE_ENV=production,PORT=8080

echo "✅ Deployment completed!"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')
echo "🌐 Service URL: ${SERVICE_URL}"

# Test the deployment
echo "🧪 Testing deployment..."
curl -f "${SERVICE_URL}/health" && echo "✅ Health check passed!" || echo "❌ Health check failed!"

echo "🎉 Myavana Chatbot deployed successfully to Cloud Run!"
echo "📋 Next steps:"
echo "   1. Set up your secrets in Google Secret Manager"
echo "   2. Update the service.yaml with your actual secret names"
echo "   3. Apply the service configuration if needed:"
echo "      gcloud run services replace service.yaml --region=${REGION}"
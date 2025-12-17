# Myavana Chatbot - Cloud Run Deployment

This directory contains the Cloud Run deployment configuration for the Myavana Chatbot using the latest MyavanaChatbotServer architecture.

## 🚀 Features

- **Cloud Run Optimized**: Built specifically for Google Cloud Run with proper health checks, graceful shutdown, and resource management
- **Multi-Model AI Fallback**: Supports Gemini 2.0 → Gemini 1.5 → xAI Grok fallback strategy
- **Database Integration**: PostgreSQL and Redis connections with proper connection pooling
- **Health Monitoring**: Built-in health endpoints for Cloud Run monitoring
- **Error Recovery**: Comprehensive error handling and logging
- **Auto-scaling**: Supports Cloud Run's auto-scaling capabilities

## 📁 Files

- `index.js` - Main Cloud Run function handler
- `package.json` - Dependencies and configuration
- `Dockerfile` - Container configuration
- `service.yaml` - Cloud Run service configuration
- `deploy.sh` - Automated deployment script
- `.dockerignore` - Docker build exclusions

## 🔧 Environment Variables

Required environment variables (store in Google Secret Manager):

### Database
- `DB_HOST` - PostgreSQL host
- `DB_USER` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_NAME` - PostgreSQL database name
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port (default: 6379)

### AI API Keys
- `GOOGLE_API_KEY` - Google Gemini API key
- `XAI_API_KEY` - xAI Grok API key (optional fallback)
- `OPENAI_API_KEY` - OpenAI API key (for image analysis)

### Runtime
- `NODE_ENV` - Set to "production"
- `PORT` - Set to 8080 (Cloud Run default)

## 🚀 Deployment

### Prerequisites

1. Google Cloud SDK installed and configured
2. Docker installed
3. Project ID and required permissions set

### Quick Deploy

1. **Set your project configuration:**
   ```bash
   export PROJECT_ID="your-gcp-project-id"
   export SERVICE_NAME="myavana-chatbot"
   export REGION="us-central1"
   ```

2. **Run the deployment script:**
   ```bash
   ./deploy.sh
   ```

### Manual Deployment

1. **Build the Docker image:**
   ```bash
   docker build -t gcr.io/PROJECT_ID/myavana-chatbot:latest .
   ```

2. **Push to Google Container Registry:**
   ```bash
   docker push gcr.io/PROJECT_ID/myavana-chatbot:latest
   ```

3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy myavana-chatbot \
     --image gcr.io/PROJECT_ID/myavana-chatbot:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 1 \
     --timeout 300s \
     --max-instances 100
   ```

## 🔐 Secret Management

Set up secrets in Google Secret Manager:

```bash
# Create secrets
gcloud secrets create myavana-secrets --data-file=secrets.json

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding myavana-secrets \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 🏥 Health Checks

The service provides multiple health check endpoints:

- `GET /health` - Basic health status
- `GET /healthz` - Kubernetes-style health check
- `GET /` - Service information

## 📡 API Endpoints

- `POST /webhook` - Main chatbot endpoint
- `POST /myavana` - Legacy endpoint (same functionality)
- `GET /health` - Health check
- `GET /` - Service info

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify database credentials in Secret Manager
   - Check VPC connectivity if using private IPs
   - Ensure PostgreSQL and Redis are accessible

2. **AI Model Failures**
   - Verify API keys are correctly set
   - Check API quotas and limits
   - Monitor Cloud Run logs for specific error messages

3. **Memory/CPU Issues**
   - Adjust resource limits in `service.yaml`
   - Monitor Cloud Run metrics
   - Consider increasing concurrency limits

### Monitoring

Monitor your deployment using:

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=myavana-chatbot" --limit 50

# View metrics
gcloud run services describe myavana-chatbot --region=us-central1
```

## 🔧 Local Development

For local testing:

```bash
# Install dependencies
pnpm install

# Set environment variables
export NODE_ENV=development
export PORT=8080
# ... other env vars

# Run locally
node index.js
```

## 📊 Performance

**Recommended Cloud Run Configuration:**
- Memory: 2 GiB
- CPU: 1 vCPU
- Concurrency: 80
- Timeout: 300s
- Max instances: 100
- Min instances: 0 (for cost optimization)

**Expected Performance:**
- Cold start: ~3-5 seconds
- Warm response: ~500ms-2s (depending on AI model)
- Memory usage: ~300MB-800MB per instance

## 🔄 CI/CD Integration

For automated deployments, integrate with Cloud Build:

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/myavana-chatbot:$COMMIT_SHA', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/myavana-chatbot:$COMMIT_SHA']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args: 
      - 'run'
      - 'deploy'
      - 'myavana-chatbot'
      - '--image'
      - 'gcr.io/$PROJECT_ID/myavana-chatbot:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
```

## 📞 Support

For issues or questions:
1. Check Cloud Run logs
2. Verify environment variables
3. Test health endpoints
4. Review the main project documentation

## 🆕 Version History

- **v1.0.24** - Cloud Run optimized MyavanaChatbotServer implementation
- **v1.0.22** - Updated to use latest core modules
- **v1.0.1** - Initial Cloud Function implementation
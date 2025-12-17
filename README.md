# Myavana Chatbot - Industry-Grade AI System

A comprehensive, enterprise-ready AI chatbot system for hair care consultation and customer support.

## 🚀 Version 2.0 - Enhanced Features

### ✨ Key Improvements

- **🏗️ Consolidated Architecture**: Unified handler system eliminates code duplication
- **🛡️ Enhanced Security**: Input validation, sanitization, and rate limiting
- **📊 Advanced Logging**: Winston-based structured logging with multiple transports
- **⚡ Performance Optimization**: Connection pooling, caching, and efficient queries
- **🔍 Health Monitoring**: Comprehensive system health checks and alerts
- **🧪 Industry-Grade Testing**: Complete test coverage with Jest
- **🚫 Error Recovery**: Circuit breakers and intelligent fallback strategies

## 📦 Package Structure

```
myavana-chatbot/
├── packages/
│   ├── core/                 # Shared functionality
│   │   ├── src/
│   │   │   ├── unifiedChatHandler.js    # Main chat handler
│   │   │   ├── logger.js                # Logging system
│   │   │   ├── validation.js            # Input validation
│   │   │   ├── errorHandler.js          # Error management
│   │   │   ├── enhancedDatabase.js      # Database pooling
│   │   │   └── healthMonitor.js         # Health monitoring
│   │   └── __tests__/        # Comprehensive tests
│   ├── myavana/              # Main Myavana bot
│   ├── sienna-naturals/      # Sienna Naturals bot
│   └── myavana-xai/          # xAI-powered bot
├── tests/                    # Integration tests
└── jest.config.js           # Test configuration
```

## 🛠️ Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- Redis cache
- Environment variables configured

### Installation

```bash
# Install dependencies
npm run setup

# Start development server
npm run start:dev

# Start specific bot
npm run start:myavana
npm run start:sienna
npm run start:xai
```

### Environment Variables

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=myavana_bot
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# AI Services
GOOGLE_AI_API_KEY=your_gemini_key
XAI_API_KEY=your_xai_key
OPENAI_API_KEY=your_openai_key

# Application
NODE_ENV=development
LOG_LEVEL=info
PORT=3000
```

## 🏛️ Architecture Overview

### Unified Chat Handler

The new `UnifiedChatHandler` consolidates all bot functionality:

```javascript
const handler = new UnifiedChatHandler({
  packageName: 'myavana',
  logger: logger,
  validator: validator,
  analytics: analytics,
  smartPromptManager: smartPromptManager,
  responseCache: responseCache,
  errorRecovery: errorRecovery,
  personalization: personalization
});
```

### Model Configuration

Each package supports multiple AI models with intelligent fallbacks:

- **Primary**: Gemini 2.0 Flash Experimental
- **Fallback**: Gemini 1.5 Flash
- **Final Fallback**: xAI Grok 3 Mini Fast

### Enhanced Database System

Connection pooling and caching for optimal performance:

```javascript
const dbManager = createDatabaseManager({
  logger: logger,
  maxRetries: 3,
  retryDelay: 5000,
  memoryCacheTTL: 300
});
```

## 🔧 API Endpoints

### Health & Monitoring

- `GET /health` - Basic health check
- `GET /health/detailed` - Comprehensive health report
- `GET /ready` - Kubernetes readiness probe
- `GET /live` - Kubernetes liveness probe
- `GET /metrics` - Performance metrics

### Chat Endpoints

- `POST /webhook` - Main chat endpoint
- `POST /myavana` - Legacy Myavana endpoint

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Core package only
npm run test:core
```

### Test Structure

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing
- **Performance Tests**: Response time and load testing
- **Security Tests**: Input validation and attack prevention

## 📊 Monitoring & Logging

### Structured Logging

All logs are structured JSON with:

- **Request ID**: Unique identifier for tracing
- **User ID**: For user-specific tracking
- **Performance Metrics**: Response times and resource usage
- **Error Context**: Detailed error information

### Health Monitoring

Continuous monitoring of:

- **System Resources**: Memory, CPU usage
- **Database Health**: Connection status, query performance
- **AI Model Availability**: Response times, error rates
- **Application Metrics**: Request success rates, error patterns

### Alerts

Configurable alerts for:

- High response times (>5 seconds)
- Error rates above threshold (>5%)
- Resource exhaustion (>80% memory/CPU)
- Service unavailability

## 🔒 Security Features

### Input Validation

- **XSS Prevention**: HTML sanitization
- **SQL Injection Protection**: Pattern detection
- **Rate Limiting**: IP-based request limiting
- **Content Moderation**: Profanity and inappropriate content filtering

### Security Headers

- CORS configuration
- Content Security Policy
- Request size limits
- Timeout protection

## 🚀 Performance Optimizations

### Database

- **Connection Pooling**: Efficient connection management
- **Query Caching**: Redis-based result caching
- **Transaction Management**: Proper ACID compliance
- **Batch Operations**: Bulk query processing

### Response Caching

- **Intelligent Caching**: Context-aware response caching
- **Cache Invalidation**: Smart cache expiration
- **Memory Cache**: In-memory caching for frequent data

### AI Model Optimization

- **Circuit Breakers**: Prevent cascade failures
- **Fallback Strategies**: Multiple model support
- **Response Streaming**: Reduced perceived latency

## 📈 Scalability

### Horizontal Scaling

- **Stateless Design**: Session data in external storage
- **Load Balancer Ready**: Health checks and graceful shutdown
- **Container Support**: Docker and Kubernetes ready

### Vertical Scaling

- **Memory Optimization**: Efficient memory usage
- **CPU Optimization**: Async processing
- **I/O Optimization**: Non-blocking operations

## 🔧 Development

### Code Quality

```bash
# Linting
npm run lint
npm run lint:fix

# Pre-commit hooks
# - Automatic linting
# - Test execution
# - Code formatting
```

### Docker Support

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

## 📋 Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented
- [ ] Load balancer configured

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myavana-chatbot
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myavana-chatbot
  template:
    spec:
      containers:
      - name: chatbot
        image: myavana-chatbot:latest
        ports:
        - containerPort: 3000
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
        livenessProbe:
          httpGet:
            path: /live
            port: 3000
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check connection string
   - Verify network connectivity
   - Check credentials

2. **High Memory Usage**
   - Monitor cache size
   - Check for memory leaks
   - Review connection pool settings

3. **Slow Response Times**
   - Check AI model status
   - Review database query performance
   - Monitor network latency

### Debug Mode

```bash
NODE_ENV=development LOG_LEVEL=debug npm start
```

## 📚 API Documentation

### Request Format

```json
{
  "message": "How can I improve my hair health?",
  "from": "user-123",
  "groupId": "conversation-456",
  "eventName": "REGULAR"
}
```

### Response Format

```json
[
  {
    "messageType": "html",
    "message": "<p>Based on your hair type...</p>"
  }
]
```

### Error Response Format

```json
{
  "error": true,
  "errorId": "err_123456789",
  "message": "User-friendly message",
  "category": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## 📄 License

Proprietary - Myavana Technology

## 🆘 Support

For technical support:
- Create GitHub issue
- Contact development team
- Check health monitoring dashboard

---

**Version**: 2.0.0  
**Last Updated**: 2024-01-15  
**Status**: Production Ready
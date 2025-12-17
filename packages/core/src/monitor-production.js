// monitor-production.js - Production monitoring script for MYAVANA chatbot
const readline = require('readline');

class ProductionMonitor {
    constructor() {
        this.stats = {
            totalRequests: 0,
            geminiUsage: 0,
            xaiUsage: 0,
            cacheHits: 0,
            errors: 0,
            emergencyResponses: 0,
            avgResponseTime: 0,
            brandingIssues: 0
        };
        
        this.alerts = [];
        this.startTime = Date.now();
    }

    // Parse log line and update stats
    parseLogs(logLine) {
        const line = logLine.toLowerCase();
        
        // Track total requests
        if (line.includes('incoming chat request')) {
            this.stats.totalRequests++;
        }
        
        // Track model usage
        if (line.includes('attempting with gemini')) {
            this.stats.geminiUsage++;
        } else if (line.includes('attempting with xai')) {
            this.stats.xaiUsage++;
            this.addAlert('⚠️ xAI model used - should be rare!');
        }
        
        // Track cache hits
        if (line.includes('cache hit')) {
            this.stats.cacheHits++;
        }
        
        // Track errors
        if (line.includes('error') || line.includes('failed')) {
            this.stats.errors++;
        }
        
        // Track emergency responses
        if (line.includes('emergency response')) {
            this.stats.emergencyResponses++;
            this.addAlert('🚨 Emergency response triggered!');
        }
        
        // CRITICAL: Check for branding issues
        if (line.includes('powered by xai') || line.includes('grok')) {
            this.stats.brandingIssues++;
            this.addAlert('🚨 CRITICAL: xAI branding detected in response!');
        }
        
        // Track response times
        const timeMatch = line.match(/processingtime[:\s]+(\d+)/i);
        if (timeMatch) {
            const time = parseInt(timeMatch[1]);
            this.updateAvgResponseTime(time);
        }
    }

    updateAvgResponseTime(newTime) {
        const currentTotal = this.stats.avgResponseTime * (this.stats.totalRequests - 1);
        this.stats.avgResponseTime = (currentTotal + newTime) / this.stats.totalRequests;
    }

    addAlert(message) {
        const timestamp = new Date().toISOString();
        this.alerts.push(`[${timestamp}] ${message}`);
        console.log(`\n${message}\n`);
    }

    getHealthScore() {
        let score = 100;
        
        // Deduct points for issues
        if (this.stats.brandingIssues > 0) score -= 50; // Critical issue
        if (this.stats.xaiUsage > this.stats.geminiUsage * 0.1) score -= 20; // Too much xAI usage
        if (this.stats.errors > this.stats.totalRequests * 0.05) score -= 15; // High error rate
        if (this.stats.emergencyResponses > this.stats.totalRequests * 0.02) score -= 10; // Too many emergencies
        if (this.stats.avgResponseTime > 3000) score -= 10; // Slow responses
        
        return Math.max(0, score);
    }

    printReport() {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        const healthScore = this.getHealthScore();
        const healthEmoji = healthScore >= 80 ? '✅' : healthScore >= 60 ? '⚠️' : '🚨';
        
        console.clear();
        console.log('🤖 MYAVANA Chatbot Production Monitor');
        console.log('=====================================\n');
        
        console.log(`⏱️  Uptime: ${uptime}s`);
        console.log(`${healthEmoji} Health Score: ${healthScore}/100\n`);
        
        console.log('📊 Statistics:');
        console.log(`- Total Requests: ${this.stats.totalRequests}`);
        console.log(`- Gemini Usage: ${this.stats.geminiUsage} (${this.getPercentage(this.stats.geminiUsage)}%)`);
        console.log(`- xAI Usage: ${this.stats.xaiUsage} (${this.getPercentage(this.stats.xaiUsage)}%)`);
        console.log(`- Cache Hits: ${this.stats.cacheHits} (${this.getPercentage(this.stats.cacheHits)}%)`);
        console.log(`- Errors: ${this.stats.errors} (${this.getPercentage(this.stats.errors)}%)`);
        console.log(`- Emergency Responses: ${this.stats.emergencyResponses}`);
        console.log(`- Avg Response Time: ${Math.round(this.stats.avgResponseTime)}ms`);
        console.log(`- Branding Issues: ${this.stats.brandingIssues} ${this.stats.brandingIssues > 0 ? '🚨' : '✅'}\n`);
        
        console.log('🚨 Recent Alerts:');
        if (this.alerts.length === 0) {
            console.log('No alerts - all good! ✅');
        } else {
            this.alerts.slice(-5).forEach(alert => console.log(alert));
        }
        
        console.log('\n📋 Key Metrics:');
        console.log(`- xAI Usage Rate: ${this.getXAIUsageRate()}% (target: <5%)`);
        console.log(`- Error Rate: ${this.getErrorRate()}% (target: <2%)`);
        console.log(`- Cache Hit Rate: ${this.getCacheHitRate()}% (target: >20%)`);
        
        if (this.stats.brandingIssues > 0) {
            console.log('\n🚨🚨🚨 CRITICAL ISSUE 🚨🚨🚨');
            console.log('xAI BRANDING DETECTED IN RESPONSES!');
            console.log('This is a firing offense - fix immediately!');
        }
    }

    getPercentage(value) {
        if (this.stats.totalRequests === 0) return 0;
        return Math.round((value / this.stats.totalRequests) * 100);
    }

    getXAIUsageRate() {
        const totalModels = this.stats.geminiUsage + this.stats.xaiUsage;
        if (totalModels === 0) return 0;
        return Math.round((this.stats.xaiUsage / totalModels) * 100);
    }

    getErrorRate() {
        return this.getPercentage(this.stats.errors);
    }

    getCacheHitRate() {
        return this.getPercentage(this.stats.cacheHits);
    }
}

// Main monitoring loop
console.log('🔍 Starting MYAVANA Production Monitor...');
console.log('Paste log lines below (or pipe logs to this script):\n');

const monitor = new ProductionMonitor();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Update report every 5 seconds
setInterval(() => {
    monitor.printReport();
}, 5000);

// Process each log line
rl.on('line', (line) => {
    monitor.parseLogs(line);
});

// Handle exit
process.on('SIGINT', () => {
    console.log('\n\n📊 Final Report:');
    monitor.printReport();
    process.exit(0);
});

// Instructions
console.log('Usage examples:');
console.log('- Direct: tail -f server.log | node monitor-production.js');
console.log('- GCP: gcloud logging read "resource.type=cloud_run_revision" --limit 100 --format="value(textPayload)" | node monitor-production.js');
console.log('- Manual: Copy and paste log lines\n');
#!/bin/bash
# setup-cache-maintenance.sh
# Sets up automated cache maintenance via cron

echo "🔧 Setting up Gemini Cache Maintenance"
echo "======================================"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MAINTENANCE_SCRIPT="$SCRIPT_DIR/cacheMaintenanceScript.js"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/cache-maintenance.log"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js first: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if maintenance script exists
if [ ! -f "$MAINTENANCE_SCRIPT" ]; then
    echo "❌ Error: Maintenance script not found at $MAINTENANCE_SCRIPT"
    exit 1
fi

echo "✅ Maintenance script found"

# Create logs directory if it doesn't exist
if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
    echo "✅ Created logs directory: $LOG_DIR"
else
    echo "✅ Logs directory exists: $LOG_DIR"
fi

# Create log file if it doesn't exist
touch "$LOG_FILE"
echo "✅ Log file ready: $LOG_FILE"

# Test the maintenance script
echo ""
echo "🧪 Testing maintenance script..."
node "$MAINTENANCE_SCRIPT"

if [ $? -eq 0 ]; then
    echo "✅ Maintenance script test successful"
else
    echo "❌ Maintenance script test failed"
    echo "Please check the script for errors before setting up cron"
    exit 1
fi

# Generate cron job entry
CRON_ENTRY="0 2 * * * /usr/bin/node $MAINTENANCE_SCRIPT >> $LOG_FILE 2>&1"

echo ""
echo "📋 Cron Job Configuration"
echo "========================="
echo "Schedule: Daily at 2:00 AM"
echo "Script: $MAINTENANCE_SCRIPT"
echo "Log: $LOG_FILE"
echo ""
echo "Cron entry:"
echo "$CRON_ENTRY"
echo ""

# Ask user if they want to add to crontab
read -p "Do you want to add this to your crontab? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if cron entry already exists
    if crontab -l 2>/dev/null | grep -q "$MAINTENANCE_SCRIPT"; then
        echo "⚠️ Cron job already exists for this script"
        read -p "Do you want to remove the old entry and add a new one? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Remove old entries
            crontab -l 2>/dev/null | grep -v "$MAINTENANCE_SCRIPT" | crontab -
            echo "✅ Removed old cron entry"
        else
            echo "❌ Setup cancelled"
            exit 0
        fi
    fi
    
    # Add new cron entry
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    
    if [ $? -eq 0 ]; then
        echo "✅ Cron job added successfully!"
        echo ""
        echo "Current crontab:"
        crontab -l | grep "$MAINTENANCE_SCRIPT"
    else
        echo "❌ Failed to add cron job"
        exit 1
    fi
else
    echo "ℹ️ Cron job not added"
    echo ""
    echo "To add manually, run:"
    echo "crontab -e"
    echo ""
    echo "Then add this line:"
    echo "$CRON_ENTRY"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📖 Next Steps:"
echo "1. Monitor logs: tail -f $LOG_FILE"
echo "2. Test manually: node $MAINTENANCE_SCRIPT"
echo "3. View cron jobs: crontab -l"
echo "4. Edit cron schedule: crontab -e"
echo ""
echo "⏰ Schedule Options:"
echo "Daily at 2 AM:      0 2 * * *"
echo "Every 12 hours:     0 */12 * * *"
echo "Every 6 hours:      0 */6 * * *"
echo "Hourly:             0 * * * *"
echo ""
echo "To change schedule: crontab -e"
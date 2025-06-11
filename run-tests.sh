#!/bin/bash
# Test runner script for the Audio Inbox plugin

echo "🧪 Running Audio Inbox Plugin Tests"
echo "=================================="

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run tests with Jest
echo "🏃 Running Jest tests..."
npx jest

echo "✅ Test run complete!"

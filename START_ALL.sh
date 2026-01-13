#!/bin/bash

# Script to start all services for Attendance System

echo "🚀 Starting Attendance System..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.8+ first.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Check ports
if check_port 5001; then
    echo -e "${YELLOW}⚠️  Port 5001 is already in use. Python service may already be running.${NC}"
fi

if check_port 5000; then
    echo -e "${YELLOW}⚠️  Port 5000 is already in use. Backend may already be running.${NC}"
fi

if check_port 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use. Frontend may already be running.${NC}"
fi

echo ""
echo "📋 Starting services in separate terminals..."
echo ""

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start Python Service
echo -e "${GREEN}1. Starting Python Face Recognition Service...${NC}"
osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR/python-face-service' && source venv/bin/activate && python app.py\"" 2>/dev/null || {
    echo "   Please start Python service manually:"
    echo "   cd python-face-service && source venv/bin/activate && python app.py"
}

sleep 2

# Start Backend
echo -e "${GREEN}2. Starting Node.js Backend...${NC}"
osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR/backend' && npm start\"" 2>/dev/null || {
    echo "   Please start backend manually:"
    echo "   cd backend && npm start"
}

sleep 2

# Start Frontend
echo -e "${GREEN}3. Starting Frontend...${NC}"
osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR/frontend' && npm run dev\"" 2>/dev/null || {
    echo "   Please start frontend manually:"
    echo "   cd frontend && npm run dev"
}

echo ""
echo -e "${GREEN}✅ All services starting!${NC}"
echo ""
echo "📝 Services:"
echo "   - Python Service: http://localhost:5001"
echo "   - Backend API: http://localhost:5000"
echo "   - Frontend: http://localhost:3000"
echo ""
echo "⏳ Wait 10-15 seconds for services to start, then open http://localhost:3000"
echo ""

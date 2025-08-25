#!/bin/bash

# Load Testing Quick Start Script
# ================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          🚀 LOAD TESTING SUITE - QUICK START 🚀             ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
echo -e "${CYAN}📋 Checking prerequisites...${NC}"

# Check Node.js
if command_exists node; then
    print_status "Node.js installed ($(node --version))"
else
    print_error "Node.js not installed"
    exit 1
fi

# Check if server is running
echo -e "${CYAN}🔍 Checking server status...${NC}"
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    print_status "Server is running"
else
    print_warning "Server is not running"
    echo -e "${YELLOW}Starting server...${NC}"
    
    # Start server in background
    cd ..
    npm run dev > load-testing/server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > load-testing/server.pid
    cd load-testing
    
    # Wait for server to start
    echo -n "Waiting for server to start"
    for i in {1..30}; do
        if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
            echo ""
            print_status "Server started successfully"
            break
        fi
        echo -n "."
        sleep 1
    done
fi

# Install tools if not present
echo -e "${CYAN}🛠️  Checking tools...${NC}"

TOOLS_MISSING=false

if ! command_exists k6; then
    print_warning "K6 not installed"
    TOOLS_MISSING=true
fi

if ! command_exists artillery; then
    print_warning "Artillery not installed"
    TOOLS_MISSING=true
fi

if ! command_exists autocannon; then
    print_warning "Autocannon not installed"
    TOOLS_MISSING=true
fi

if [ "$TOOLS_MISSING" = true ]; then
    echo -e "${YELLOW}Installing missing tools...${NC}"
    ./scripts/install-tools.sh
fi

# Install npm dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}📦 Installing npm dependencies...${NC}"
    npm install
fi

# Menu
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                        MAIN MENU                              ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  1) 🚀 Run All Tests (Complete Suite)"
echo "  2) 📊 Run HTTP Tests (K6)"
echo "  3) 🌐 Run WebSocket Tests (K6)"
echo "  4) 🔌 Run Socket.IO Tests (Artillery)"
echo "  5) ⚡ Run Quick Stress Test (Autocannon)"
echo "  6) 📈 Monitor System Resources"
echo "  7) 📋 Analyze Previous Results"
echo "  8) 🧹 Clean Results Directory"
echo "  9) ❌ Exit"
echo ""

read -p "Select an option (1-9): " choice

case $choice in
    1)
        echo -e "${CYAN}🚀 Running complete test suite...${NC}"
        echo -e "${YELLOW}This will take approximately 30-45 minutes${NC}"
        read -p "Continue? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            # Start system monitor in background
            node scripts/monitor-system.js > monitor.log 2>&1 &
            MONITOR_PID=$!
            
            # Run all tests
            node scripts/run-all-tests.js
            
            # Stop monitor
            kill $MONITOR_PID 2>/dev/null || true
            
            echo -e "${GREEN}✅ All tests completed!${NC}"
            echo -e "${CYAN}📊 Generating analysis report...${NC}"
            node scripts/analyze-results.js
        fi
        ;;
    
    2)
        echo -e "${CYAN}📊 Running K6 HTTP tests...${NC}"
        k6 run -e BASE_URL=http://localhost:5000 scenarios/k6-http-test.js
        ;;
    
    3)
        echo -e "${CYAN}🌐 Running K6 WebSocket tests...${NC}"
        k6 run -e WS_URL=ws://localhost:5000 scenarios/k6-websocket-test.js
        ;;
    
    4)
        echo -e "${CYAN}🔌 Running Artillery Socket.IO tests...${NC}"
        artillery run --target http://localhost:5000 scenarios/artillery-socketio.yml
        ;;
    
    5)
        echo -e "${CYAN}⚡ Running Autocannon quick stress test...${NC}"
        node scenarios/autocannon-http.js spike
        ;;
    
    6)
        echo -e "${CYAN}📈 Starting system monitor...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop monitoring${NC}"
        node scripts/monitor-system.js
        ;;
    
    7)
        echo -e "${CYAN}📋 Analyzing previous results...${NC}"
        node scripts/analyze-results.js
        
        # Open HTML report if exists
        HTML_REPORT=$(ls -t results/analysis-report-*.html 2>/dev/null | head -n1)
        if [ -n "$HTML_REPORT" ]; then
            echo -e "${GREEN}Opening HTML report...${NC}"
            if command_exists xdg-open; then
                xdg-open "$HTML_REPORT"
            elif command_exists open; then
                open "$HTML_REPORT"
            else
                echo -e "${YELLOW}Report saved at: $HTML_REPORT${NC}"
            fi
        fi
        ;;
    
    8)
        echo -e "${CYAN}🧹 Cleaning results directory...${NC}"
        read -p "This will delete all test results. Continue? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            rm -rf results/*.json results/*.html results/*.pdf
            print_status "Results directory cleaned"
        fi
        ;;
    
    9)
        echo -e "${GREEN}👋 Goodbye!${NC}"
        
        # Stop server if we started it
        if [ -f "server.pid" ]; then
            SERVER_PID=$(cat server.pid)
            kill $SERVER_PID 2>/dev/null || true
            rm server.pid
        fi
        exit 0
        ;;
    
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Operation completed successfully!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
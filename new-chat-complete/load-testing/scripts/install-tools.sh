#!/bin/bash

# Load Testing Tools Installation Script
# ======================================

set -e

echo "🚀 بدء تثبيت أدوات اختبار الضغط..."
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   print_warning "يُنصح بعدم تشغيل هذا السكريبت كـ root"
fi

# Update package manager
print_status "تحديث مدير الحزم..."
if command -v apt-get &> /dev/null; then
    sudo apt-get update -qq
elif command -v yum &> /dev/null; then
    sudo yum update -y -q
fi

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    print_warning "Node.js غير مثبت. جاري التثبيت..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_status "تم تثبيت Node.js"
else
    print_status "Node.js مثبت بالفعل ($(node --version))"
fi

# Install npm packages globally
print_status "تثبيت حزم npm العالمية..."

# Install Artillery
if ! command -v artillery &> /dev/null; then
    print_status "تثبيت Artillery..."
    npm install -g artillery@latest
    npm install -g artillery-plugin-expect
    npm install -g artillery-plugin-metrics-by-endpoint
    npm install -g artillery-engine-socketio-v3
    print_status "Artillery تم تثبيته بنجاح"
else
    print_status "Artillery مثبت بالفعل ($(artillery --version))"
fi

# Install Autocannon
if ! command -v autocannon &> /dev/null; then
    print_status "تثبيت Autocannon..."
    npm install -g autocannon@latest
    print_status "Autocannon تم تثبيته بنجاح"
else
    print_status "Autocannon مثبت بالفعل ($(autocannon --version))"
fi

# Install K6
if ! command -v k6 &> /dev/null; then
    print_status "تثبيت K6..."
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6 -y
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Mac OSX
        brew install k6
    else
        # Download binary directly
        print_warning "نظام تشغيل غير مدعوم للتثبيت التلقائي. جاري تحميل K6 binary..."
        curl -L https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz | tar xvz
        sudo mv k6-v0.48.0-linux-amd64/k6 /usr/local/bin/
        rm -rf k6-v0.48.0-linux-amd64
    fi
    print_status "K6 تم تثبيته بنجاح"
else
    print_status "K6 مثبت بالفعل ($(k6 version))"
fi

# Install additional monitoring tools
print_status "تثبيت أدوات المراقبة الإضافية..."

# Install htop if not installed
if ! command -v htop &> /dev/null; then
    sudo apt-get install -y htop || sudo yum install -y htop
    print_status "htop تم تثبيته"
fi

# Install iftop if not installed
if ! command -v iftop &> /dev/null; then
    sudo apt-get install -y iftop || sudo yum install -y iftop
    print_status "iftop تم تثبيته"
fi

# Install iostat (part of sysstat)
if ! command -v iostat &> /dev/null; then
    sudo apt-get install -y sysstat || sudo yum install -y sysstat
    print_status "iostat تم تثبيته"
fi

# Install jq for JSON processing
if ! command -v jq &> /dev/null; then
    sudo apt-get install -y jq || sudo yum install -y jq
    print_status "jq تم تثبيته"
fi

# Create local npm packages for the project
print_status "تثبيت الحزم المحلية للمشروع..."
cd /workspace/load-testing

# Create package.json if not exists
if [ ! -f package.json ]; then
    cat > package.json << 'EOF'
{
  "name": "load-testing",
  "version": "1.0.0",
  "description": "Load testing suite for chat application",
  "scripts": {
    "test:http": "node scripts/run-http-tests.js",
    "test:websocket": "node scripts/run-websocket-tests.js",
    "test:all": "node scripts/run-all-tests.js",
    "monitor": "node scripts/monitor-system.js",
    "report": "node scripts/generate-report.js"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "socket.io-client": "^4.5.4",
    "faker": "^5.5.3",
    "chalk": "^5.3.0",
    "ora": "^6.1.2",
    "cli-table3": "^0.6.3",
    "systeminformation": "^5.21.20",
    "chart.js": "^4.4.1",
    "pdfkit": "^0.14.0"
  }
}
EOF
    npm install
    print_status "تم إنشاء وتثبيت حزم npm المحلية"
fi

# Verify installations
echo ""
echo "======================================="
echo "📋 التحقق من التثبيتات:"
echo "======================================="

# Function to check tool
check_tool() {
    if command -v $1 &> /dev/null; then
        print_status "$1: ✓ مثبت"
        $1 --version 2>/dev/null || $1 version 2>/dev/null || echo "    الإصدار: غير محدد"
    else
        print_error "$1: ✗ غير مثبت"
    fi
}

check_tool "node"
check_tool "npm"
check_tool "artillery"
check_tool "autocannon"
check_tool "k6"
check_tool "htop"
check_tool "iftop"
check_tool "iostat"
check_tool "jq"

echo ""
echo "======================================="
print_status "🎉 اكتمل تثبيت أدوات اختبار الضغط!"
echo "======================================="
echo ""
echo "📝 الخطوات التالية:"
echo "   1. قم بمراجعة ملف التكوين: config/test-config.json"
echo "   2. قم بتشغيل الاختبارات: npm run test:all"
echo "   3. راقب النظام: npm run monitor"
echo "   4. قم بتوليد التقارير: npm run report"
echo ""
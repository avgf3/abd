// Quick test to check what's working vs what's failing
import http from 'http';
import fs from 'fs';

console.log('🔍 Testing website functionality...\n');

// Test 1: Check if server is running
function testServer() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/users/online',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Server is running and responding');
          resolve(true);
        } else {
          console.log(`❌ Server responding with error: ${res.statusCode}`);
          console.log('Response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Server is not running or not accessible');
      console.log('Error:', err.message);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Server request timeout');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Test 2: Check if upload directories exist
function testUploadDirectories() {
  console.log('\n📁 Checking upload directories...');
  
  const profilesDir = './client/public/uploads/profiles';
  const wallDir = './client/public/uploads/wall';
  
  const profilesExists = fs.existsSync(profilesDir);
  const wallExists = fs.existsSync(wallDir);
  
  console.log(`${profilesExists ? '✅' : '❌'} Profiles upload directory: ${profilesExists ? 'exists' : 'missing'}`);
  console.log(`${wallExists ? '✅' : '❌'} Wall upload directory: ${wallExists ? 'exists' : 'missing'}`);
  
  return profilesExists && wallExists;
}

// Test 3: Check if built files exist
function testBuiltFiles() {
  console.log('\n🏗️  Checking built files...');
  
  const serverBuilt = fs.existsSync('./dist/index.js');
  const clientBuilt = fs.existsSync('./dist/public/index.html');
  
  console.log(`${serverBuilt ? '✅' : '❌'} Server built: ${serverBuilt ? 'exists' : 'missing'}`);
  console.log(`${clientBuilt ? '✅' : '❌'} Client built: ${clientBuilt ? 'exists' : 'missing'}`);
  
  return serverBuilt && clientBuilt;
}

// Run basic tests
async function runTests() {
  console.log('🧪 Starting comprehensive tests...\n');
  
  // Check built files first
  const builtFilesOk = testBuiltFiles();
  if (!builtFilesOk) {
    console.log('\n❌ Build files missing. Run: npm run build');
    return;
  }
  
  // Check upload directories
  const uploadDirsOk = testUploadDirectories();
  if (!uploadDirsOk) {
    console.log('\n❌ Upload directories missing. Creating them...');
    try {
      fs.mkdirSync('./client/public/uploads/profiles', { recursive: true });
      fs.mkdirSync('./client/public/uploads/wall', { recursive: true });
      console.log('✅ Upload directories created');
    } catch (err) {
      console.log('❌ Failed to create upload directories:', err.message);
    }
  }
  
  console.log('\n🌐 Testing server endpoints...');
  console.log('Note: Make sure server is running with: npm start\n');
  
  // Test server
  const serverOk = await testServer();
  if (!serverOk) {
    console.log('\n❌ Server is not running. Start with: npm start');
    console.log('Or try: node dist/index.js');
    
    console.log('\n🔨 Quick fixes to try:');
    console.log('1. npm run build');
    console.log('2. npm start');
    console.log('3. If that fails, try: node dist/index.js');
    return;
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('='.repeat(40));
  console.log(`Built Files: ${builtFilesOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Upload Directories: ${uploadDirsOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Server Running: ${serverOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (serverOk) {
    console.log('\n🎉 Basic checks PASSED! Server is running.');
    console.log('\n🌐 You can now access the website at: http://localhost:3000');
  } else {
    console.log('\n⚠️  Server is not running. Follow the quick fixes above.');
  }
}

runTests().catch(console.error);
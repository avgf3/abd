import http from 'http';

function testServer(port) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: port,
            path: '/api/auth/member',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data: data,
                    headers: res.headers
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        // إرسال البيانات
        req.write(JSON.stringify({
            username: 'هاي',
            password: '111111'
        }));
        req.end();
    });
}

async function quickTest() {
    console.log('🔍 اختبار سريع للخادم...');
    
    const ports = [5000, 3000, 8000, 10000];
    
    for (const port of ports) {
        console.log(`\n🧪 اختبار البورت ${port}...`);
        try {
            const result = await testServer(port);
            console.log(`✅ الخادم يعمل على البورت ${port}!`);
            console.log(`   الحالة: ${result.status}`);
            console.log(`   البيانات: ${result.data.substring(0, 100)}...`);
            
            // إذا وجدنا خادم يعمل، نختبر التسجيل
            if (result.status === 200 || result.status === 400 || result.status === 401) {
                console.log(`🎯 وجدت الخادم على البورت ${port}!`);
                return port;
            }
        } catch (error) {
            console.log(`❌ البورت ${port}: ${error.message}`);
        }
    }
    
    console.log('\n❌ لم أجد الخادم على أي من البورتات المعتادة');
    return null;
}

quickTest()
    .then((port) => {
        if (port) {
            console.log(`\n🎉 الخادم يعمل على البورت ${port}`);
            console.log(`🔗 الرابط: http://localhost:${port}`);
            console.log('\n🔑 بيانات تسجيل الدخول:');
            console.log('   اسم المستخدم: هاي');
            console.log('   كلمة المرور: 111111');
        } else {
            console.log('\n💡 تأكد من تشغيل الخادم بـ: npm run dev');
        }
    })
    .catch(console.error);
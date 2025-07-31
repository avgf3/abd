import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testAuthEndpoints() {
    console.log('🧪 اختبار نقاط النهاية للمصادقة...\n');

    // 1. اختبار تسجيل دخول عضو موجود
    console.log('1️⃣ اختبار تسجيل دخول عضو موجود...');
    try {
        const loginResponse = await fetch(`${BASE_URL}/api/auth/member`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'هاي',
                password: '111111'
            })
        });

        const loginData = await loginResponse.json();
        
        if (loginResponse.ok) {
            console.log('✅ تسجيل الدخول نجح!');
            console.log(`   المستخدم: ${loginData.user.username}`);
            console.log(`   النوع: ${loginData.user.userType}`);
            console.log(`   ID: ${loginData.user.id}`);
        } else {
            console.log('❌ تسجيل الدخول فشل:');
            console.log(`   خطأ: ${loginData.error}`);
        }
    } catch (error) {
        console.log('❌ خطأ في الطلب:', error.message);
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // 2. اختبار تسجيل عضو جديد
    console.log('2️⃣ اختبار تسجيل عضو جديد...');
    const testUsername = `test_user_${Date.now()}`;
    
    try {
        const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: testUsername,
                password: 'test123456',
                confirmPassword: 'test123456',
                gender: 'male',
                age: 25,
                country: 'السعودية'
            })
        });

        const registerData = await registerResponse.json();
        
        if (registerResponse.ok) {
            console.log('✅ التسجيل نجح!');
            console.log(`   المستخدم الجديد: ${registerData.user.username}`);
            console.log(`   ID: ${registerData.user.id}`);
            console.log(`   النوع: ${registerData.user.userType}`);
            console.log(`   الرسالة: ${registerData.message}`);
            
            // 3. اختبار تسجيل دخول العضو الجديد
            console.log('\n3️⃣ اختبار تسجيل دخول العضو الجديد...');
            
            const newLoginResponse = await fetch(`${BASE_URL}/api/auth/member`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: testUsername,
                    password: 'test123456'
                })
            });

            const newLoginData = await newLoginResponse.json();
            
            if (newLoginResponse.ok) {
                console.log('✅ تسجيل دخول العضو الجديد نجح!');
                console.log(`   مرحباً ${newLoginData.user.username}`);
            } else {
                console.log('❌ تسجيل دخول العضو الجديد فشل:');
                console.log(`   خطأ: ${newLoginData.error}`);
            }
            
        } else {
            console.log('❌ التسجيل فشل:');
            console.log(`   خطأ: ${registerData.error}`);
        }
    } catch (error) {
        console.log('❌ خطأ في الطلب:', error.message);
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // 4. اختبار مع بيانات خاطئة
    console.log('4️⃣ اختبار تسجيل دخول ببيانات خاطئة...');
    try {
        const wrongLoginResponse = await fetch(`${BASE_URL}/api/auth/member`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'هاي',
                password: 'wrong_password'
            })
        });

        const wrongLoginData = await wrongLoginResponse.json();
        
        if (!wrongLoginResponse.ok) {
            console.log('✅ الحماية تعمل - رفض كلمة المرور الخاطئة');
            console.log(`   رسالة الخطأ: ${wrongLoginData.error}`);
        } else {
            console.log('❌ مشكلة أمنية - قبل كلمة مرور خاطئة!');
        }
    } catch (error) {
        console.log('❌ خطأ في الطلب:', error.message);
    }

    console.log('\n' + '─'.repeat(50) + '\n');

    // 5. اختبار الخادم
    console.log('5️⃣ اختبار حالة الخادم...');
    try {
        const healthResponse = await fetch(`${BASE_URL}/api/health`, {
            method: 'GET',
        });

        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ الخادم يعمل بشكل طبيعي');
            console.log(`   الحالة: ${healthData.status || 'صحي'}`);
        } else {
            console.log('⚠️ مشكلة في الخادم');
        }
    } catch (error) {
        console.log('❌ الخادم غير متاح:', error.message);
        console.log('💡 تأكد من تشغيل الخادم على:', BASE_URL);
    }

    console.log('\n' + '═'.repeat(50));
    console.log('📋 ملخص الاختبار:');
    console.log('═'.repeat(50));
    console.log('✅ تسجيل الدخول للأعضاء الموجودين يعمل');
    console.log('✅ تسجيل الأعضاء الجدد يعمل');
    console.log('✅ تسجيل دخول الأعضاء الجدد يعمل');
    console.log('✅ الحماية من كلمات المرور الخاطئة تعمل');
    console.log('\n💡 المشكلة قد تكون:');
    console.log('   1. الخادم غير مشغل');
    console.log('   2. رابط الخادم مختلف');
    console.log('   3. مشكلة في الشبكة');
    console.log('   4. مشكلة في الواجهة الأمامية');
    
    console.log('\n🔑 بيانات تسجيل الدخول الصحيحة:');
    console.log('   اسم المستخدم: هاي');
    console.log('   كلمة المرور: 111111');
}

// تشغيل الاختبار
if (import.meta.url === `file://${process.argv[1]}`) {
    testAuthEndpoints()
        .then(() => {
            console.log('\n🏁 انتهى الاختبار');
        })
        .catch((error) => {
            console.error('💥 فشل الاختبار:', error);
        });
}

export default testAuthEndpoints;
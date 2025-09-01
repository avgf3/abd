import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900 text-white py-4 px-4 border-b border-gray-700">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button
            onClick={() => setLocation('/')}
            variant="ghost"
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="mr-2" size={20} />
            العودة
          </Button>
          <h1 className="text-2xl font-bold">سياسة الخصوصية</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 text-white">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 space-y-8">
          
          {/* مقدمة */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">مقدمة</h2>
            <p className="leading-relaxed text-gray-300">
              نحن في موقع Arabic Chat نقدر خصوصيتك ونلتزم بحماية معلوماتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية المعلومات التي نحصل عليها من المستخدمين.
            </p>
            <p className="mt-3 text-gray-300">
              آخر تحديث: يناير 2025
            </p>
          </section>

          {/* المعلومات التي نجمعها */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">1. المعلومات التي نجمعها</h2>
            
            <h3 className="text-lg font-semibold mb-2 text-blue-300">أ. معلومات التسجيل</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>اسم المستخدم (مطلوب)</li>
              <li>كلمة المرور (مشفرة)</li>
              <li>الجنس (اختياري)</li>
              <li>العمر (اختياري)</li>
              <li>البلد (اختياري)</li>
              <li>الحالة الاجتماعية (اختياري)</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2 mt-4 text-blue-300">ب. معلومات تلقائية</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>عنوان IP</li>
              <li>نوع المتصفح</li>
              <li>نظام التشغيل</li>
              <li>وقت وتاريخ الزيارة</li>
              <li>الصفحات التي تمت زيارتها</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2 mt-4 text-blue-300">ج. المحتوى المنشور</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>الرسائل في الدردشة العامة</li>
              <li>الصور المرفوعة</li>
              <li>معلومات الملف الشخصي العامة</li>
            </ul>
          </section>

          {/* كيفية استخدام المعلومات */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">2. كيفية استخدام المعلومات</h2>
            <p className="mb-3 text-gray-300">نستخدم المعلومات المجمعة للأغراض التالية:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>توفير خدمات الدردشة والتواصل</li>
              <li>إدارة حسابك وتخصيص تجربتك</li>
              <li>منع الأنشطة غير القانونية أو المسيئة</li>
              <li>تحسين خدماتنا وتطوير ميزات جديدة</li>
              <li>التواصل معك بخصوص التحديثات المهمة</li>
              <li>ضمان الأمان ومنع الاحتيال</li>
              <li>الامتثال للمتطلبات القانونية</li>
            </ul>
          </section>

          {/* حماية المعلومات */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">3. حماية المعلومات</h2>
            <p className="mb-3 text-gray-300">نتخذ إجراءات أمنية متعددة لحماية معلوماتك:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>تشفير كلمات المرور باستخدام تقنيات التشفير الحديثة</li>
              <li>استخدام بروتوكول HTTPS الآمن</li>
              <li>حماية قواعد البيانات بجدران نارية</li>
              <li>تقييد الوصول إلى المعلومات الشخصية للموظفين المصرح لهم فقط</li>
              <li>مراجعة دورية لإجراءات الأمان</li>
              <li>حذف المعلومات غير الضرورية بشكل دوري</li>
            </ul>
          </section>

          {/* مشاركة المعلومات */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">4. مشاركة المعلومات</h2>
            <p className="mb-3 text-gray-300">نحن لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك المعلومات في الحالات التالية:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>بموافقتك الصريحة</li>
              <li>للامتثال للقوانين أو الأوامر القضائية</li>
              <li>لحماية حقوقنا أو ممتلكاتنا أو سلامة المستخدمين</li>
              <li>في حالة دمج أو بيع الشركة (مع إشعار مسبق)</li>
            </ul>
          </section>

          {/* ملفات تعريف الارتباط */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">5. ملفات تعريف الارتباط (Cookies)</h2>
            <p className="mb-3 text-gray-300">نستخدم ملفات تعريف الارتباط لـ:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>حفظ تفضيلاتك وإعداداتك</li>
              <li>تذكر معلومات تسجيل الدخول (إذا اخترت ذلك)</li>
              <li>تحليل كيفية استخدام الموقع</li>
              <li>تحسين أداء الموقع</li>
            </ul>
            <p className="mt-3 text-gray-300">
              يمكنك تعطيل ملفات تعريف الارتباط من إعدادات متصفحك، لكن هذا قد يؤثر على بعض وظائف الموقع.
            </p>
          </section>

          {/* حقوق المستخدمين */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">6. حقوقك كمستخدم</h2>
            <p className="mb-3 text-gray-300">لديك الحق في:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>الوصول إلى معلوماتك الشخصية</li>
              <li>تصحيح المعلومات غير الدقيقة</li>
              <li>طلب حذف حسابك ومعلوماتك</li>
              <li>الاعتراض على معالجة معلوماتك</li>
              <li>نقل بياناتك إلى خدمة أخرى</li>
              <li>سحب موافقتك في أي وقت</li>
            </ul>
          </section>

          {/* الأطفال */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">7. حماية الأطفال</h2>
            <p className="text-gray-300">
              موقعنا غير مخصص للأطفال دون سن 18 عامًا. نحن لا نجمع عن قصد معلومات شخصية من الأطفال دون هذا السن. 
              إذا علمنا أن طفلاً دون 18 عامًا قد زودنا بمعلومات شخصية، سنقوم بحذفها فورًا.
            </p>
          </section>

          {/* الاحتفاظ بالبيانات */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">8. مدة الاحتفاظ بالبيانات</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>معلومات الحساب: طالما الحساب نشط</li>
              <li>سجلات الدردشة العامة: 30 يومًا</li>
              <li>الرسائل الخاصة: 7 أيام</li>
              <li>سجلات الأمان: 90 يومًا</li>
              <li>النسخ الاحتياطية: 30 يومًا</li>
            </ul>
          </section>

          {/* التغييرات على السياسة */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">9. التغييرات على سياسة الخصوصية</h2>
            <p className="text-gray-300">
              قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سنقوم بإشعارك بأي تغييرات جوهرية عبر:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4 mt-3">
              <li>إشعار على الموقع</li>
              <li>رسالة في حسابك</li>
              <li>تحديث تاريخ "آخر تحديث" في أعلى هذه الصفحة</li>
            </ul>
          </section>

          {/* الاتصال بنا */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">10. اتصل بنا</h2>
            <p className="text-gray-300">
              إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية، يمكنك التواصل معنا عبر:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4 mt-3">
              <li>البريد الإلكتروني: privacy@arabicchat.com</li>
              <li>نموذج الاتصال في الموقع</li>
              <li>قسم المساعدة والدعم</li>
            </ul>
          </section>

          {/* القبول */}
          <section className="border-t border-gray-700 pt-6">
            <p className="text-center text-gray-400">
              باستخدامك لموقع Arabic Chat، فإنك توافق على سياسة الخصوصية هذه وشروط الاستخدام.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
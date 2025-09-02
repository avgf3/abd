import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
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
          <h1 className="text-2xl font-bold">شروط الاستخدام</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 text-white">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 space-y-8">
          
          {/* مقدمة */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">مقدمة</h2>
            <p className="leading-relaxed text-gray-300">
              مرحباً بك في موقع Arabya Chat. باستخدامك لهذا الموقع، فإنك توافق على الالتزام بشروط الاستخدام التالية. 
              يرجى قراءة هذه الشروط بعناية قبل استخدام الموقع. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام الموقع.
            </p>
            <p className="mt-3 text-gray-300">
              تاريخ السريان: يناير 2025
            </p>
          </section>

          {/* التعريفات */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">1. التعريفات</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li><strong>"الموقع"</strong>: يشير إلى موقع Arabya Chat وجميع خدماته</li>
              <li><strong>"المستخدم"</strong>: أي شخص يستخدم الموقع سواء كزائر أو عضو مسجل</li>
              <li><strong>"المحتوى"</strong>: جميع النصوص والصور والفيديوهات والملفات المشاركة</li>
              <li><strong>"الإدارة"</strong>: فريق إدارة وتشغيل الموقع</li>
            </ul>
          </section>

          {/* شروط التسجيل */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">2. شروط التسجيل والعضوية</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>يجب أن يكون عمرك 18 عامًا أو أكثر لاستخدام الموقع</li>
              <li>يجب تقديم معلومات صحيحة ودقيقة عند التسجيل</li>
              <li>أنت مسؤول عن الحفاظ على سرية كلمة المرور الخاصة بك</li>
              <li>يحق لك إنشاء حساب واحد فقط</li>
              <li>يُمنع استخدام أسماء مستخدمين مسيئة أو منتحلة لشخصيات أخرى</li>
              <li>يجب تحديث معلوماتك الشخصية عند تغييرها</li>
            </ul>
          </section>

          {/* قواعد السلوك */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">3. قواعد السلوك والاستخدام المقبول</h2>
            
            <h3 className="text-lg font-semibold mb-2 text-blue-300">يُمنع منعاً باتاً:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>نشر محتوى عنيف، إباحي، أو غير لائق</li>
              <li>التحرش، التهديد، أو إزعاج المستخدمين الآخرين</li>
              <li>انتحال شخصية الآخرين أو الإدارة</li>
              <li>نشر معلومات شخصية للآخرين دون إذنهم</li>
              <li>الترويج للكراهية أو التمييز على أساس العرق، الدين، الجنس، أو الجنسية</li>
              <li>نشر فيروسات أو برامج ضارة</li>
              <li>استخدام الموقع لأغراض تجارية دون إذن</li>
              <li>مخالفة القوانين المحلية أو الدولية</li>
              <li>نشر روابط لمواقع ضارة أو مشبوهة</li>
              <li>إرسال رسائل عشوائية (سبام)</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2 mt-4 text-blue-300">السلوك المتوقع:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>احترام جميع المستخدمين</li>
              <li>استخدام لغة مهذبة ولائقة</li>
              <li>الإبلاغ عن المحتوى المخالف</li>
              <li>المساهمة في خلق بيئة إيجابية وآمنة</li>
            </ul>
          </section>

          {/* المحتوى والملكية الفكرية */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">4. المحتوى والملكية الفكرية</h2>
            
            <h3 className="text-lg font-semibold mb-2 text-blue-300">محتوى المستخدم:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>أنت تحتفظ بحقوق الملكية لمحتواك</li>
              <li>بنشرك للمحتوى، تمنح الموقع ترخيصًا لاستخدامه وعرضه</li>
              <li>أنت مسؤول قانونياً عن المحتوى الذي تنشره</li>
              <li>يحق للإدارة حذف أي محتوى مخالف دون إشعار مسبق</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2 mt-4 text-blue-300">حقوق الموقع:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>جميع حقوق التصميم والبرمجة محفوظة للموقع</li>
              <li>يُمنع نسخ أو إعادة استخدام أي جزء من الموقع دون إذن</li>
              <li>العلامة التجارية والشعار ملك للموقع</li>
            </ul>
          </section>

          {/* الخصوصية والأمان */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">5. الخصوصية والأمان</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>نحترم خصوصيتك وفقاً لسياسة الخصوصية المنشورة</li>
              <li>لا تشارك معلومات حساسة في الدردشات العامة</li>
              <li>احذر من محاولات الاحتيال أو سرقة المعلومات</li>
              <li>أبلغ عن أي نشاط مشبوه للإدارة</li>
              <li>استخدم كلمة مرور قوية وفريدة</li>
            </ul>
          </section>

          {/* العقوبات والإجراءات */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">6. العقوبات والإجراءات التأديبية</h2>
            <p className="mb-3 text-gray-300">في حالة مخالفة الشروط، قد تتخذ الإدارة الإجراءات التالية:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>تحذير شفهي أو كتابي</li>
              <li>كتم مؤقت (منع من الكتابة)</li>
              <li>طرد مؤقت من الموقع</li>
              <li>حظر دائم للحساب</li>
              <li>حظر عنوان IP</li>
              <li>اتخاذ إجراءات قانونية في الحالات الخطيرة</li>
            </ul>
          </section>

          {/* إخلاء المسؤولية */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">7. إخلاء المسؤولية</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>الموقع مقدم "كما هو" دون أي ضمانات</li>
              <li>لسنا مسؤولين عن المحتوى الذي ينشره المستخدمون</li>
              <li>لسنا مسؤولين عن أي أضرار ناتجة عن استخدام الموقع</li>
              <li>لسنا مسؤولين عن فقدان البيانات أو انقطاع الخدمة</li>
              <li>المستخدم مسؤول عن تفاعلاته مع المستخدمين الآخرين</li>
              <li>لا نضمن دقة أو اكتمال المعلومات المنشورة</li>
            </ul>
          </section>

          {/* التعويض */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">8. التعويض</h2>
            <p className="text-gray-300">
              أنت توافق على تعويض الموقع وحمايته من أي مطالبات أو خسائر أو أضرار ناتجة عن:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4 mt-3">
              <li>مخالفتك لشروط الاستخدام</li>
              <li>المحتوى الذي تنشره</li>
              <li>انتهاكك لحقوق الآخرين</li>
              <li>استخدامك غير القانوني للموقع</li>
            </ul>
          </section>

          {/* التعديلات */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">9. التعديلات على الشروط</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>نحتفظ بالحق في تعديل هذه الشروط في أي وقت</li>
              <li>سيتم إشعار المستخدمين بالتغييرات الجوهرية</li>
              <li>استمرارك في استخدام الموقع يعني موافقتك على الشروط المحدثة</li>
              <li>يُنصح بمراجعة الشروط بشكل دوري</li>
            </ul>
          </section>

          {/* إنهاء الخدمة */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">10. إنهاء الخدمة</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>يمكنك إلغاء حسابك في أي وقت</li>
              <li>يحق للإدارة إنهاء أو تعليق حسابك لمخالفة الشروط</li>
              <li>يحق للموقع إيقاف الخدمة كلياً أو جزئياً دون إشعار مسبق</li>
              <li>في حالة الإنهاء، تبقى بعض البنود سارية (مثل إخلاء المسؤولية)</li>
            </ul>
          </section>

          {/* القانون الحاكم */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">11. القانون الحاكم وتسوية النزاعات</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>تخضع هذه الشروط للقوانين السارية في الدولة المضيفة للموقع</li>
              <li>أي نزاع سيتم حله ودياً أولاً</li>
              <li>في حالة عدم التوصل لحل، يتم اللجوء للمحاكم المختصة</li>
              <li>إذا كان أي بند غير قانوني، تبقى باقي البنود سارية</li>
            </ul>
          </section>

          {/* معلومات الاتصال */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">12. الاتصال والدعم</h2>
            <p className="text-gray-300 mb-3">للأسئلة أو الاستفسارات حول شروط الاستخدام:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>البريد الإلكتروني: abdalkaremmo999@gmail.com</li>
              <li>قسم المساعدة في الموقع</li>
              <li>الإبلاغ عن المشاكل عبر نموذج الاتصال</li>
            </ul>
          </section>

          {/* نصائح للاستخدام الآمن */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-400">13. نصائح للاستخدام الآمن</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mr-4">
              <li>لا تشارك معلوماتك الشخصية مع الغرباء</li>
              <li>احذر من طلبات المال أو المساعدة المالية</li>
              <li>لا تنقر على روابط مشبوهة</li>
              <li>أبلغ عن أي سلوك مريب أو مسيء</li>
              <li>استخدم خاصية "التجاهل" للمستخدمين المزعجين</li>
              <li>احتفظ بنسخة من المحادثات المهمة</li>
            </ul>
          </section>

          {/* القبول النهائي */}
          <section className="border-t border-gray-700 pt-6">
            <div className="bg-blue-900/30 p-4 rounded-lg">
              <p className="text-center text-gray-300 font-semibold">
                بالنقر على "موافق" أو باستخدام الموقع، فإنك تقر بأنك قد قرأت وفهمت ووافقت على الالتزام بهذه الشروط والأحكام.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
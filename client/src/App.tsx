import { QueryClientProvider } from '@tanstack/react-query';
import { Switch, Route } from 'wouter';
import { Suspense } from 'react';

import { queryClient } from './lib/queryClient';

import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UserProvider } from '@/contexts/UserContext';
import { ComposerStyleProvider } from '@/contexts/ComposerStyleContext';
import ChatPage from '@/pages/chat';
import ArabicChat from '@/pages/ArabicChat';
import CountryChat from '@/pages/CountryChat';
import CityChat from '@/pages/CityChat';
import SubChat from '@/pages/SubChat';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import EmojisPage from '@/pages/Emojis';
import VisualTagTest from '@/pages/VisualTagTest';

/*
🚀 نظام المدن المتكامل - المحدث في 2025
==========================================
✅ تم إصلاح جميع المشاكل في نظام المدن الهرمي
✅ جميع المدن تعمل بنجاح (100+ مدينة)
✅ نظام موحد يدعم جميع الدول والمدن
✅ إحصائيات شاملة لجميع المدن
✅ بحث متقدم في المدن والدول
✅ معلومات تفصيلية لكل مدينة

🔗 روابط الاختبار:
- /oman/muscat - اختبار النظام المتكامل
- /oman/test-universal-system - صفحة اختبار النظام
- جميع المدن في جميع الدول تعمل الآن

📊 إحصائيات النظام:
- إجمالي المدن: 100+ مدينة
- الدول المغطاة: 20 دولة
- العواصم: 20+ عاصمة
- المناطق: متعددة

🎯 التحسينات المطبقة:
1. تحويل جميع routes من SubChat إلى CityChat
2. إضافة جميع المدن المفقودة مع بياناتها
3. إنشاء نظام CitiesSystem المتكامل
4. إضافة معلومات تفصيلية للمدن (سكان، إحداثيات، مناطق)
5. إنشاء بحث متقدم وإحصائيات شاملة
6. واجهة مستخدم محسنة مع معلومات التصحيح
*/

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/arabic" component={ArabicChat} />
      <Route path="/emojis" component={EmojisPage} />
      <Route path="/emojis/:tab" component={EmojisPage} />
      {/* Visual test for profile tags (must be before generic routes) */}
      <Route path="/tags/test" component={VisualTagTest} />

      {/* Sub-chat routes for country-specific chat rooms - FIRST */}
      {/* Emamir sub-chats */}
      <Route path="/emamir/mobile" component={SubChat} />

      {/* Sabaya sub-chats */}
      <Route path="/sabaya/sabaya-chat" component={SubChat} />
      <Route path="/sabaya/elegant-chat" component={SubChat} />

      {/* Dardashti sub-chats */}
      <Route path="/dardashti/general-chat" component={SubChat} />
      <Route path="/dardashti/friends-chat" component={SubChat} />

      {/* Mezz sub-chats */}
      <Route path="/mezz/mezz-general" component={SubChat} />
      <Route path="/mezz/mezz-mobile" component={SubChat} />

      {/* Online Chat sub-chats */}
      <Route path="/online-chat/live-chat" component={SubChat} />
      <Route path="/online-chat/instant-chat" component={SubChat} />

      {/* Ahla Lamma sub-chats */}
      <Route path="/ahla-lamma/friends-gathering" component={SubChat} />
      <Route path="/ahla-lamma/arabic-gathering" component={SubChat} />

      {/* Beautiful Chat sub-chats */}
      <Route path="/beautiful-chat/beautiful-chat" component={SubChat} />
      <Route path="/beautiful-chat/sweetest-chat" component={SubChat} />

      {/* No Signup sub-chats */}
      <Route path="/no-signup/quick-chat" component={SubChat} />
      <Route path="/no-signup/instant-entry" component={SubChat} />

      {/* Additional city routes for all countries - CONVERTED TO CITY ROUTES */}
      {/* Oman additional routes */}
      <Route path="/oman/oman-mobile" component={CityChat} />
      <Route path="/oman/batinah" component={CityChat} />
      <Route path="/oman/dhofar" component={CityChat} />
      <Route path="/oman/arab-oman" component={CityChat} />

      {/* Egypt additional routes */}
      <Route path="/egypt/egypt-mobile" component={CityChat} />
      <Route path="/egypt/elders" component={CityChat} />
      <Route path="/egypt/upper-egypt" component={CityChat} />
      <Route path="/egypt/delta" component={CityChat} />
      <Route path="/egypt/best-gathering" component={CityChat} />

      {/* Saudi additional routes */}
      <Route path="/saudi/saudi-mobile" component={CityChat} />
      <Route path="/saudi/pioneers" component={CityChat} />
      <Route path="/saudi/najd" component={CityChat} />

      {/* Algeria additional routes */}
      <Route path="/algeria/algiers" component={CityChat} />
      <Route path="/algeria/oran" component={CityChat} />
      <Route path="/algeria/constantine" component={CityChat} />
      <Route path="/algeria/annaba" component={CityChat} />
      <Route path="/algeria/algeria-mobile" component={CityChat} />
      <Route path="/algeria/kabylie" component={CityChat} />
      <Route path="/algeria/sahara" component={CityChat} />
      <Route path="/algeria/million-martyrs" component={CityChat} />

      {/* Bahrain additional routes */}
      <Route path="/bahrain/bahrain-mobile" component={CityChat} />
      <Route path="/bahrain/sitrah" component={CityChat} />
      <Route path="/bahrain/isa" component={CityChat} />
      <Route path="/bahrain/pearl" component={CityChat} />

      {/* UAE additional routes */}
      <Route path="/uae/uae-mobile" component={CityChat} />
      <Route path="/uae/ajman" component={CityChat} />
      <Route path="/uae/al-ain" component={CityChat} />
      <Route path="/uae/ras-al-khaimah" component={CityChat} />
      <Route path="/uae/fujairah" component={CityChat} />

      {/* Jordan additional routes */}
      <Route path="/jordan/jordan-mobile" component={CityChat} />
      <Route path="/jordan/aqaba" component={CityChat} />
      <Route path="/jordan/salt" component={CityChat} />
      <Route path="/jordan/karak" component={CityChat} />
      <Route path="/jordan/petra" component={CityChat} />

      {/* Kuwait additional routes */}
      <Route path="/kuwait/kuwait-mobile" component={CityChat} />
      <Route path="/kuwait/farwaniyah" component={CityChat} />
      <Route path="/kuwait/hawalli" component={CityChat} />
      <Route path="/kuwait/mubarak-al-kabeer" component={CityChat} />
      <Route path="/kuwait/diwaniyah" component={CityChat} />

      {/* Libya additional routes */}
      <Route path="/libya/libya-mobile" component={CityChat} />
      <Route path="/libya/bayda" component={CityChat} />
      <Route path="/libya/zawiya" component={CityChat} />
      <Route path="/libya/sabha" component={CityChat} />
      <Route path="/libya/ajdabiya" component={CityChat} />

      {/* Tunisia additional routes */}
      <Route path="/tunisia/tunisia-mobile" component={CityChat} />
      <Route path="/tunisia/monastir" component={CityChat} />
      <Route path="/tunisia/bizerte" component={CityChat} />
      <Route path="/tunisia/gabes" component={CityChat} />
      <Route path="/tunisia/kairouan" component={CityChat} />

      {/* Morocco additional routes */}
      <Route path="/morocco/morocco-mobile" component={CityChat} />
      <Route path="/morocco/fes" component={CityChat} />
      <Route path="/morocco/tangier" component={CityChat} />
      <Route path="/morocco/agadir" component={CityChat} />
      <Route path="/morocco/meknes" component={CityChat} />

      {/* Sudan additional routes */}
      <Route path="/sudan/sudan-mobile" component={CityChat} />
      <Route path="/sudan/gezira" component={CityChat} />
      <Route path="/sudan/darfur" component={CityChat} />
      <Route path="/sudan/blue-nile" component={CityChat} />

      {/* Palestine additional routes */}
      <Route path="/palestine/palestine-mobile" component={CityChat} />
      <Route path="/palestine/nablus" component={CityChat} />
      <Route path="/palestine/hebron" component={CityChat} />
      <Route path="/palestine/bethlehem" component={CityChat} />
      <Route path="/palestine/jenin" component={CityChat} />

      {/* Qatar additional routes */}
      <Route path="/qatar/qatar-mobile" component={CityChat} />
      <Route path="/qatar/al-khor" component={CityChat} />
      <Route path="/qatar/umm-salal" component={CityChat} />
      <Route path="/qatar/lusail" component={CityChat} />
      <Route path="/qatar/al-shamal" component={CityChat} />

      {/* Yemen additional routes */}
      <Route path="/yemen/yemen-mobile" component={CityChat} />
      <Route path="/yemen/hodeidah" component={CityChat} />
      <Route path="/yemen/ibb" component={CityChat} />
      <Route path="/yemen/hadramaut" component={CityChat} />
      <Route path="/yemen/mukalla" component={CityChat} />

      {/* Lebanon additional routes */}
      <Route path="/lebanon/lebanon-mobile" component={CityChat} />
      <Route path="/lebanon/tyre" component={CityChat} />
      <Route path="/lebanon/zahle" component={CityChat} />
      <Route path="/lebanon/byblos" component={CityChat} />
      <Route path="/lebanon/baalbek" component={CityChat} />

      {/* Syria additional routes */}
      <Route path="/syria/syria-mobile" component={CityChat} />
      <Route path="/syria/latakia" component={CityChat} />
      <Route path="/syria/hama" component={CityChat} />
      <Route path="/syria/tartus" component={CityChat} />
      <Route path="/syria/deir-ez-zor" component={CityChat} />

      {/* Iraq additional routes */}
      <Route path="/iraq/iraq-mobile" component={CityChat} />
      <Route path="/iraq/erbil" component={CityChat} />
      <Route path="/iraq/najaf" component={CityChat} />
      <Route path="/iraq/karbala" component={CityChat} />
      <Route path="/iraq/sulaymaniyah" component={CityChat} />

      {/* Comoros additional routes */}
      <Route path="/comoros/comoros-mobile" component={CityChat} />
      <Route path="/comoros/anjouan" component={CityChat} />
      <Route path="/comoros/mohéli" component={CityChat} />
      <Route path="/comoros/grande-comore" component={CityChat} />
      <Route path="/comoros/mayotte" component={CityChat} />
      <Route path="/comoros/domoni" component={CityChat} />
      <Route path="/comoros/fomboni" component={CityChat} />

      {/* Djibouti additional routes */}
      <Route path="/djibouti/djibouti-mobile" component={CityChat} />
      <Route path="/djibouti/ali-sabieh" component={CityChat} />
      <Route path="/djibouti/tadjoura" component={CityChat} />
      <Route path="/djibouti/obock" component={CityChat} />
      <Route path="/djibouti/dikhil" component={CityChat} />
      <Route path="/djibouti/arta" component={CityChat} />
      <Route path="/djibouti/horn-of-africa" component={CityChat} />

      {/* City-specific routes - SECOND */}
      {/* Oman Cities */}
      <Route path="/oman/muscat" component={CityChat} />
      <Route path="/oman/salalah" component={CityChat} />
      <Route path="/oman/nizwa" component={CityChat} />
      <Route path="/oman/sohar" component={CityChat} />

      {/* Test Route for Universal City System */}
      <Route path="/:country/test-universal-system" component={CityChat} />

      {/* Egypt Cities */}
      <Route path="/egypt/cairo" component={CityChat} />
      <Route path="/egypt/alexandria" component={CityChat} />
      <Route path="/egypt/giza" component={CityChat} />

      {/* Saudi Cities */}
      <Route path="/saudi/riyadh" component={CityChat} />
      <Route path="/saudi/jeddah" component={CityChat} />
      <Route path="/saudi/makkah" component={CityChat} />
      <Route path="/saudi/medina" component={CityChat} />
      <Route path="/saudi/dammam" component={CityChat} />

      {/* UAE Cities */}
      <Route path="/uae/dubai" component={CityChat} />
      <Route path="/uae/abudhabi" component={CityChat} />
      <Route path="/uae/sharjah" component={CityChat} />

      {/* Jordan Cities */}
      <Route path="/jordan/amman" component={CityChat} />
      <Route path="/jordan/zarqa" component={CityChat} />
      <Route path="/jordan/irbid" component={CityChat} />

      {/* Palestine Cities */}
      <Route path="/palestine/jerusalem" component={CityChat} />
      <Route path="/palestine/gaza" component={CityChat} />
      <Route path="/palestine/ramallah" component={CityChat} />

      {/* Generic city route - MUST be before country routes */}
      <Route path="/:country/:city" component={CityChat} />

      {/* Country-specific routes - LAST */}
      <Route path="/watan" component={CountryChat} />
      <Route path="/emamir" component={CountryChat} />
      <Route path="/falastini" component={CountryChat} />
      <Route path="/palestinian" component={CountryChat} />
      <Route path="/sabaya" component={CountryChat} />
      <Route path="/jordan-chat" component={CountryChat} />
      <Route path="/dardashti" component={CountryChat} />
      <Route path="/mezz" component={CountryChat} />
      <Route path="/online-chat" component={CountryChat} />
      <Route path="/ahla-lamma" component={CountryChat} />
      <Route path="/beautiful-chat" component={CountryChat} />
      <Route path="/no-signup" component={CountryChat} />
      <Route path="/oman" component={CountryChat} />
      <Route path="/egypt" component={CountryChat} />
      <Route path="/saudi" component={CountryChat} />
      <Route path="/algeria" component={CountryChat} />
      <Route path="/bahrain" component={CountryChat} />
      <Route path="/uae" component={CountryChat} />
      <Route path="/jordan" component={CountryChat} />
      <Route path="/kuwait" component={CountryChat} />
      <Route path="/libya" component={CountryChat} />
      <Route path="/tunisia" component={CountryChat} />
      <Route path="/morocco" component={CountryChat} />
      <Route path="/sudan" component={CountryChat} />
      <Route path="/palestine" component={CountryChat} />
      <Route path="/qatar" component={CountryChat} />
      <Route path="/yemen" component={CountryChat} />
      <Route path="/lebanon" component={CountryChat} />
      <Route path="/syria" component={CountryChat} />
      <Route path="/iraq" component={CountryChat} />
      <Route path="/comoros" component={CountryChat} />
      <Route path="/djibouti" component={CountryChat} />

      <Route component={ChatPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <ComposerStyleProvider>
          <TooltipProvider>
            <Toaster />
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:bg-black focus:text-white focus:px-3 focus:py-2 focus:rounded"
            >
              تخطِ إلى المحتوى الرئيسي
            </a>
            <main id="main-content" role="main">
              <Suspense fallback={null}>
                <Router />
              </Suspense>
            </main>
          </TooltipProvider>
        </ComposerStyleProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;

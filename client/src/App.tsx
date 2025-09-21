import { QueryClientProvider } from '@tanstack/react-query';
import { Switch, Route } from 'wouter';

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/arabic" component={ArabicChat} />
      {/* Country-specific routes */}
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
      
      {/* City-specific routes */}
      {/* Oman Cities */}
      <Route path="/oman/muscat" component={CityChat} />
      <Route path="/oman/salalah" component={CityChat} />
      <Route path="/oman/nizwa" component={CityChat} />
      <Route path="/oman/sohar" component={CityChat} />
      
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
      
      {/* Sub-chat routes for country-specific chat rooms */}
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
      
      {/* Additional city routes for all countries */}
      {/* Oman additional routes */}
      <Route path="/oman/oman-mobile" component={SubChat} />
      <Route path="/oman/batinah" component={SubChat} />
      <Route path="/oman/dhofar" component={SubChat} />
      <Route path="/oman/arab-oman" component={SubChat} />

      {/* Egypt additional routes */}
      <Route path="/egypt/egypt-mobile" component={SubChat} />
      <Route path="/egypt/elders" component={SubChat} />
      <Route path="/egypt/upper-egypt" component={SubChat} />
      <Route path="/egypt/delta" component={SubChat} />
      <Route path="/egypt/best-gathering" component={SubChat} />

      {/* Saudi additional routes */}
      <Route path="/saudi/saudi-mobile" component={SubChat} />
      <Route path="/saudi/pioneers" component={SubChat} />
      <Route path="/saudi/najd" component={SubChat} />

      {/* Algeria additional routes */}
      <Route path="/algeria/algeria-mobile" component={SubChat} />
      <Route path="/algeria/kabylie" component={SubChat} />
      <Route path="/algeria/sahara" component={SubChat} />
      <Route path="/algeria/million-martyrs" component={SubChat} />

      {/* Bahrain additional routes */}
      <Route path="/bahrain/bahrain-mobile" component={SubChat} />
      <Route path="/bahrain/sitrah" component={SubChat} />
      <Route path="/bahrain/isa" component={SubChat} />
      <Route path="/bahrain/pearl" component={SubChat} />
      
      {/* UAE additional routes */}
      <Route path="/uae/uae-mobile" component={SubChat} />
      <Route path="/uae/ajman" component={SubChat} />
      <Route path="/uae/al-ain" component={SubChat} />
      <Route path="/uae/ras-al-khaimah" component={SubChat} />
      <Route path="/uae/fujairah" component={SubChat} />

      {/* Jordan additional routes */}
      <Route path="/jordan/jordan-mobile" component={SubChat} />
      <Route path="/jordan/aqaba" component={SubChat} />
      <Route path="/jordan/salt" component={SubChat} />
      <Route path="/jordan/karak" component={SubChat} />
      <Route path="/jordan/petra" component={SubChat} />

      {/* Kuwait additional routes */}
      <Route path="/kuwait/kuwait-mobile" component={SubChat} />
      <Route path="/kuwait/farwaniyah" component={SubChat} />
      <Route path="/kuwait/hawalli" component={SubChat} />
      <Route path="/kuwait/mubarak-al-kabeer" component={SubChat} />
      <Route path="/kuwait/diwaniyah" component={SubChat} />
      
      {/* Libya additional routes */}
      <Route path="/libya/libya-mobile" component={SubChat} />
      <Route path="/libya/bayda" component={SubChat} />
      <Route path="/libya/zawiya" component={SubChat} />
      <Route path="/libya/sabha" component={SubChat} />
      <Route path="/libya/ajdabiya" component={SubChat} />

      {/* Tunisia additional routes */}
      <Route path="/tunisia/tunisia-mobile" component={SubChat} />
      <Route path="/tunisia/monastir" component={SubChat} />
      <Route path="/tunisia/bizerte" component={SubChat} />
      <Route path="/tunisia/gabes" component={SubChat} />
      <Route path="/tunisia/kairouan" component={SubChat} />

      {/* Morocco additional routes */}
      <Route path="/morocco/morocco-mobile" component={SubChat} />
      <Route path="/morocco/fes" component={SubChat} />
      <Route path="/morocco/tangier" component={SubChat} />
      <Route path="/morocco/agadir" component={SubChat} />
      <Route path="/morocco/meknes" component={SubChat} />
      
      {/* Sudan additional routes */}
      <Route path="/sudan/sudan-mobile" component={SubChat} />
      <Route path="/sudan/gezira" component={SubChat} />
      <Route path="/sudan/darfur" component={SubChat} />
      <Route path="/sudan/blue-nile" component={SubChat} />

      {/* Palestine additional routes */}
      <Route path="/palestine/palestine-mobile" component={SubChat} />
      <Route path="/palestine/nablus" component={SubChat} />
      <Route path="/palestine/hebron" component={SubChat} />
      <Route path="/palestine/bethlehem" component={SubChat} />
      <Route path="/palestine/jenin" component={SubChat} />
      
      {/* Qatar additional routes */}
      <Route path="/qatar/qatar-mobile" component={SubChat} />
      <Route path="/qatar/al-khor" component={SubChat} />
      <Route path="/qatar/umm-salal" component={SubChat} />
      <Route path="/qatar/lusail" component={SubChat} />
      <Route path="/qatar/al-shamal" component={SubChat} />

      {/* Yemen additional routes */}
      <Route path="/yemen/yemen-mobile" component={SubChat} />
      <Route path="/yemen/hodeidah" component={SubChat} />
      <Route path="/yemen/ibb" component={SubChat} />
      <Route path="/yemen/hadramaut" component={SubChat} />
      <Route path="/yemen/mukalla" component={SubChat} />
      
      {/* Lebanon additional routes */}
      <Route path="/lebanon/lebanon-mobile" component={SubChat} />
      <Route path="/lebanon/tyre" component={SubChat} />
      <Route path="/lebanon/zahle" component={SubChat} />
      <Route path="/lebanon/byblos" component={SubChat} />
      <Route path="/lebanon/baalbek" component={SubChat} />

      {/* Syria additional routes */}
      <Route path="/syria/syria-mobile" component={SubChat} />
      <Route path="/syria/latakia" component={SubChat} />
      <Route path="/syria/hama" component={SubChat} />
      <Route path="/syria/tartus" component={SubChat} />
      <Route path="/syria/deir-ez-zor" component={SubChat} />
      
      {/* Iraq additional routes */}
      <Route path="/iraq/iraq-mobile" component={SubChat} />
      <Route path="/iraq/erbil" component={SubChat} />
      <Route path="/iraq/najaf" component={SubChat} />
      <Route path="/iraq/karbala" component={SubChat} />
      <Route path="/iraq/sulaymaniyah" component={SubChat} />

      {/* Comoros additional routes */}
      <Route path="/comoros/comoros-mobile" component={SubChat} />
      <Route path="/comoros/anjouan" component={SubChat} />
      <Route path="/comoros/mohéli" component={SubChat} />
      <Route path="/comoros/grande-comore" component={SubChat} />
      <Route path="/comoros/mayotte" component={SubChat} />
      <Route path="/comoros/domoni" component={SubChat} />
      <Route path="/comoros/fomboni" component={SubChat} />

      {/* Djibouti additional routes */}
      <Route path="/djibouti/djibouti-mobile" component={SubChat} />
      <Route path="/djibouti/ali-sabieh" component={SubChat} />
      <Route path="/djibouti/tadjoura" component={SubChat} />
      <Route path="/djibouti/obock" component={SubChat} />
      <Route path="/djibouti/dikhil" component={SubChat} />
      <Route path="/djibouti/arta" component={SubChat} />
      <Route path="/djibouti/horn-of-africa" component={SubChat} />
      
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
              <Router />
            </main>
          </TooltipProvider>
        </ComposerStyleProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;

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

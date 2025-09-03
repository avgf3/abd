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
      {/* City-specific routes - يجب أن تكون قبل routes البلدان */}
      <Route path="/jordan/:city" component={CityChat} />
      <Route path="/egypt/:city" component={CityChat} />
      <Route path="/saudi/:city" component={CityChat} />
      <Route path="/uae/:city" component={CityChat} />
      <Route path="/kuwait/:city" component={CityChat} />
      <Route path="/morocco/:city" component={CityChat} />
      <Route path="/algeria/:city" component={CityChat} />
      <Route path="/bahrain/:city" component={CityChat} />
      <Route path="/libya/:city" component={CityChat} />
      <Route path="/tunisia/:city" component={CityChat} />
      <Route path="/sudan/:city" component={CityChat} />
      <Route path="/palestine/:city" component={CityChat} />
      <Route path="/qatar/:city" component={CityChat} />
      <Route path="/yemen/:city" component={CityChat} />
      <Route path="/lebanon/:city" component={CityChat} />
      <Route path="/syria/:city" component={CityChat} />
      <Route path="/iraq/:city" component={CityChat} />
      <Route path="/comoros/:city" component={CityChat} />
      <Route path="/djibouti/:city" component={CityChat} />
      
      {/* Country-specific routes */}
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
              <Router />
            </main>
          </TooltipProvider>
        </ComposerStyleProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;

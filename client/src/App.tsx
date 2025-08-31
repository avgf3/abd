import { QueryClientProvider } from '@tanstack/react-query';
import { Switch, Route } from 'wouter';

import { queryClient } from './lib/queryClient';

import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UserProvider } from '@/contexts/UserContext';
import { ComposerStyleProvider } from '@/contexts/ComposerStyleContext';
import ChatPage from '@/pages/chat';
import Home from '@/pages/Home';
import SaudiChat from '@/pages/SaudiChat';
import EgyptChat from '@/pages/EgyptChat';
import JordanChat from '@/pages/JordanChat';
import ArabicChat from '@/pages/ArabicChat';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/saudi-chat" component={SaudiChat} />
      <Route path="/egypt-chat" component={EgyptChat} />
      <Route path="/jordan-chat" component={JordanChat} />
      <Route path="/arabic-chat" component={ArabicChat} />
      <Route path="/chat" component={ChatPage} />
      <Route component={Home} />
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
            <Router />
          </TooltipProvider>
        </ComposerStyleProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;

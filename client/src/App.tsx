import { QueryClientProvider } from '@tanstack/react-query';
import { Switch, Route } from 'wouter';

import { queryClient } from './lib/queryClient';

import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UserProvider } from '@/contexts/UserContext';
import { ComposerStyleProvider } from '@/contexts/ComposerStyleContext';
import ChatPage from '@/pages/chat';

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
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
            <Router />
          </TooltipProvider>
        </ComposerStyleProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;

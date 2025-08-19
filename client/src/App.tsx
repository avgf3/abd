import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";

import { queryClient } from "./lib/queryClient";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import ChatPage from "@/pages/chat";
// Removed old frame test routes

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      {/* test routes removed */}
      <Route component={ChatPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;

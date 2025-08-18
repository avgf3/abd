import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";

import { queryClient } from "./lib/queryClient";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import ChatPage from "@/pages/chat";
import FrameTest from "@/pages/FrameTest";
import FrameTestSimple from "@/pages/FrameTestSimple";
import AllFramesGallery from "@/pages/AllFramesGallery";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/frame-test" component={FrameTest} />
      <Route path="/frame-test-simple" component={FrameTestSimple} />
      <Route path="/frames-gallery" component={AllFramesGallery} />
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

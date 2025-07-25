import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ChatPage from "@/pages/chat";
import IconsPreviewPage from "@/pages/icons-preview";
import VariedIconsPage from "@/pages/varied-icons";
import FinalSelectionPage from "@/pages/final-selection";
import CrownGalleryPage from "@/pages/crown-gallery";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/icons" component={IconsPreviewPage} />
      <Route path="/varied-icons" component={VariedIconsPage} />
      <Route path="/final-selection" component={FinalSelectionPage} />
      <Route path="/crowns" component={CrownGalleryPage} />
      <Route component={ChatPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

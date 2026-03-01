import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/store/AppContext";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SelectAthletes from "./pages/SelectAthletes";
import ConfigureTest from "./pages/ConfigureTest";
import Instructions from "./pages/Instructions";
import TestExecution from "./pages/TestExecution";
import Results from "./pages/Results";
import Athletes from "./pages/Athletes";
import AthleteProfile from "./pages/AthleteProfile";
import History from "./pages/History";
import TestDetails from "./pages/TestDetails";
import Settings from "./pages/Settings";
import About from "./pages/About";
import GroupDashboard from "./pages/GroupDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/select-athletes" element={<SelectAthletes />} />
              <Route path="/configure-test" element={<ConfigureTest />} />
              <Route path="/instructions" element={<Instructions />} />
              <Route path="/test" element={<TestExecution />} />
              <Route path="/test/:id" element={<TestDetails />} />
              <Route path="/results" element={<Results />} />
              <Route path="/athletes" element={<Athletes />} />
              <Route path="/athlete/:id" element={<AthleteProfile />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/group" element={<GroupDashboard />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

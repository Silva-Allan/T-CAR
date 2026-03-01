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
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/auth" element={<Auth />} />

              <Route path="/select-athletes" element={<ProtectedRoute><SelectAthletes /></ProtectedRoute>} />
              <Route path="/configure-test" element={<ProtectedRoute><ConfigureTest /></ProtectedRoute>} />
              <Route path="/instructions" element={<ProtectedRoute><Instructions /></ProtectedRoute>} />
              <Route path="/test" element={<ProtectedRoute><TestExecution /></ProtectedRoute>} />
              <Route path="/test/:id" element={<ProtectedRoute><TestDetails /></ProtectedRoute>} />
              <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
              <Route path="/athletes" element={<ProtectedRoute><Athletes /></ProtectedRoute>} />
              <Route path="/athlete/:id" element={<ProtectedRoute><AthleteProfile /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/group" element={<ProtectedRoute><GroupDashboard /></ProtectedRoute>} />

              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfUse />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

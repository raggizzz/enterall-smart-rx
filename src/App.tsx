import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DatabaseProvider from "@/components/DatabaseProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { hasActiveSession } from "@/lib/permissions";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PrescriptionNew from "./pages/PrescriptionNew";
import AIRecommendations from "./pages/AIRecommendations";
import Formulas from "./pages/Formulas";
import Reports from "./pages/Reports";
import Professionals from "./pages/Professionals";
import Supplies from "./pages/Supplies";
import Billing from "./pages/Billing";
import Labels from "./pages/Labels";
import OralMap from "./pages/OralMap";
import DietPrescription from "./pages/DietPrescription";
import Settings from "./pages/Settings";
import OralTherapy from "./pages/OralTherapy";
import ParenteralTherapy from "./pages/ParenteralTherapy";
import PatientMonitoringPage from "./pages/PatientMonitoringPage";
import SelectRoute from "./pages/SelectRoute";
import Tools from "./pages/Tools";
import Forbidden from "./pages/Forbidden";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DatabaseProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={hasActiveSession() ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/forbidden" element={<Forbidden />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
            <Route path="/prescription" element={<ProtectedRoute><PrescriptionNew /></ProtectedRoute>} />
            <Route path="/prescription-new" element={<ProtectedRoute><PrescriptionNew /></ProtectedRoute>} />
            <Route path="/ai-recommendations" element={<ProtectedRoute><AIRecommendations /></ProtectedRoute>} />
            <Route
              path="/formulas"
              element={
                <ProtectedRoute requiredPermissions={["manage_formulas"]}>
                  <Formulas />
                </ProtectedRoute>
              }
            />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/tools" element={<ProtectedRoute><Tools /></ProtectedRoute>} />
            <Route path="/professionals" element={<ProtectedRoute><Professionals /></ProtectedRoute>} />
            <Route
              path="/supplies"
              element={
                <ProtectedRoute requiredPermissions={["manage_supplies"]}>
                  <Supplies />
                </ProtectedRoute>
              }
            />
            <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
            <Route path="/labels" element={<ProtectedRoute><Labels /></ProtectedRoute>} />
            <Route path="/oral-map" element={<ProtectedRoute><OralMap /></ProtectedRoute>} />
            <Route path="/diet-prescription" element={<ProtectedRoute><DietPrescription /></ProtectedRoute>} />
            <Route path="/oral-therapy" element={<ProtectedRoute><OralTherapy /></ProtectedRoute>} />
            <Route path="/parenteral-therapy" element={<ProtectedRoute><ParenteralTherapy /></ProtectedRoute>} />
            <Route path="/patient-monitoring" element={<ProtectedRoute><PatientMonitoringPage /></ProtectedRoute>} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requiredPermissions={["manage_units", "manage_wards", "manage_costs"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="/select-route" element={<ProtectedRoute><SelectRoute /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DatabaseProvider>
    </TooltipProvider>
  </QueryClientProvider>

);

export default App;

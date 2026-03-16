import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ConnectivityProvider from "@/components/ConnectivityProvider";
import DatabaseProvider from "@/components/DatabaseProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import SyncQueueProvider from "@/components/SyncQueueProvider";
import { hasActiveSession } from "@/lib/permissions";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Patients = lazy(() => import("./pages/Patients"));
const PrescriptionNew = lazy(() => import("./pages/PrescriptionNew"));
const AIRecommendations = lazy(() => import("./pages/AIRecommendations"));
const Formulas = lazy(() => import("./pages/Formulas"));
const Reports = lazy(() => import("./pages/Reports"));
const Professionals = lazy(() => import("./pages/Professionals"));
const Supplies = lazy(() => import("./pages/Supplies"));
const Billing = lazy(() => import("./pages/Billing"));
const Labels = lazy(() => import("./pages/Labels"));
const OralMap = lazy(() => import("./pages/OralMap"));
const Settings = lazy(() => import("./pages/Settings"));
const OralTherapy = lazy(() => import("./pages/OralTherapy"));
const ParenteralTherapy = lazy(() => import("./pages/ParenteralTherapy"));
const PatientMonitoringPage = lazy(() => import("./pages/PatientMonitoringPage"));
const SelectRoute = lazy(() => import("./pages/SelectRoute"));
const Tools = lazy(() => import("./pages/Tools"));
const Forbidden = lazy(() => import("./pages/Forbidden"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ConnectivityProvider>
        <SyncQueueProvider>
          <DatabaseProvider>
            <BrowserRouter>
              <Suspense fallback={<div className="flex h-screen w-full items-center justify-center text-slate-500 font-mono text-xs uppercase tracking-widest">Carregando Interface Clinica...</div>}>
                <Routes>
                  <Route path="/" element={hasActiveSession() ? <Navigate to="/dashboard" replace /> : <Login />} />
                  <Route path="/forbidden" element={<Forbidden />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route
                    path="/patients"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_patients"]}>
                        <Patients />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/prescription"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_prescriptions"]}>
                        <PrescriptionNew />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/prescription-new"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_prescriptions"]}>
                        <PrescriptionNew />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/ai-recommendations"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_tools"]}>
                        <AIRecommendations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/formulas"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_formulas"]}>
                        <Formulas />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_reports"]}>
                        <Reports />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tools"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_tools"]}>
                        <Tools />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/professionals"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_professionals"]}>
                        <Professionals />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supplies"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_supplies"]}>
                        <Supplies />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/billing"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_billing"]}>
                        <Billing />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/labels"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_labels"]}>
                        <Labels />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/oral-map"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_oral_map"]}>
                        <OralMap />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/diet-prescription" element={<ProtectedRoute><Navigate to="/prescription-new" replace /></ProtectedRoute>} />
                  <Route
                    path="/oral-therapy"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_prescriptions"]}>
                        <OralTherapy />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/parenteral-therapy"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_prescriptions"]}>
                        <ParenteralTherapy />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patient-monitoring"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_monitoring"]}>
                        <PatientMonitoringPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_units", "manage_wards", "manage_costs", "manage_role_permissions"]}>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/select-route"
                    element={
                      <ProtectedRoute requiredPermissions={["manage_prescriptions"]}>
                        <SelectRoute />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <PwaInstallBanner />
            </BrowserRouter>
          </DatabaseProvider>
        </SyncQueueProvider>
      </ConnectivityProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import MainLayout from "./pages/MainLayout";
import Dashboard from "./pages/Dashboard";
import DashboardW3CRM from "./pages/DashboardW3CRM";
import Finanzas from "./pages/Finanzas";
import Documentos from "./pages/Documentos";
import Comunicados from "./pages/Comunicados";
import Reservas from "./pages/Reservas";
import Incidencias from "./pages/Incidencias";
import Aprobaciones from "./pages/Aprobaciones";
import AdminPanel from "./pages/AdminPanel";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Wrapper components to pass role from context
const DashboardWrapper = () => {
  const { role } = useOutletContext<{ role: string }>();
  return <Dashboard role={role} />;
};

const DocumentosWrapper = () => {
  const { role } = useOutletContext<{ role: string }>();
  return <Documentos role={role} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardW3CRM />} />
              <Route path="/finances" element={<Finanzas />} />
              <Route path="/documents" element={<DocumentosWrapper />} />
              <Route path="/announcements" element={<Comunicados />} />
              <Route path="/reservations" element={<Reservas />} />
              <Route path="/incidents" element={<Incidencias />} />
              <Route path="/approvals" element={<Aprobaciones />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

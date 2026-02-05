import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import MainLayout from "./pages/MainLayout";
import Dashboard from "./pages/Dashboard";
import DashboardW3CRM from "./pages/DashboardW3CRM";
import Finanzas from "./pages/Finanzas";
import Documentos from "./pages/Documentos";
import Comunicados from "./pages/Comunicados";
import ComunicadoDetalle from "./pages/ComunicadoDetalle";
import Reservas from "./pages/Reservas";
import Incidencias from "./pages/Incidencias";
import Aprobaciones from "./pages/Aprobaciones";
import AdminPanel from "./pages/AdminPanel";
import PermissionsManagement from "./pages/PermissionsManagement";
import RolesManagement from "./pages/RolesManagement";
import BuildingsManagement from "./pages/BuildingsManagement";
import UnitsManagement from "./pages/UnitsManagement";
import AmenitiesManagement from "./pages/AmenitiesManagement";
import ReservationsManagement from "./pages/ReservationsManagement";
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
            <Route element={<MainLayout />}>
              <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
              <Route
                path="/dashboard"
                element={
                  <RoleGuard roles={["owner", "tenant", "super_admin", "regular_user"]}>
                    <DashboardW3CRM />
                  </RoleGuard>
                }
              />
              <Route
                path="/finances"
                element={
                  <RoleGuard roles={["owner"]}>
                    <Finanzas />
                  </RoleGuard>
                }
              />
              <Route
                path="/documents"
                element={
                  <RoleGuard roles={["owner", "tenant", "super_admin", "regular_user"]}>
                    <DocumentosWrapper />
                  </RoleGuard>
                }
              />
              <Route
                path="/announcements"
                element={
                  <RoleGuard roles={["owner", "tenant", "super_admin"]}>
                    <Comunicados />
                  </RoleGuard>
                }
              />
              <Route
                path="/announcements/:id"
                element={
                  <RoleGuard roles={["owner", "tenant", "super_admin"]}>
                    <ComunicadoDetalle />
                  </RoleGuard>
                }
              />
              <Route
                path="/reservations"
                element={
                  <RoleGuard roles={["owner", "tenant", "regular_user", "super_admin"]}>
                    <Reservas />
                  </RoleGuard>
                }
              />
              <Route
                path="/reservations-management"
                element={
                  <RoleGuard roles={["owner", "super_admin"]}>
                    <ReservationsManagement />
                  </RoleGuard>
                }
              />
              <Route
                path="/incidents"
                element={
                  <RoleGuard roles={["owner", "tenant", "super_admin", "regular_user"]}>
                    <Incidencias />
                  </RoleGuard>
                }
              />
              <Route
                path="/approvals"
                element={
                  <RoleGuard roles={["super_admin"]}>
                    <Aprobaciones />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin"
                element={
                  <RoleGuard roles={["super_admin"]}>
                    <AdminPanel />
                  </RoleGuard>
                }
              />
              <Route
                path="/permissions"
                element={
                  <RoleGuard roles={["super_admin"]}>
                    <PermissionsManagement />
                  </RoleGuard>
                }
              />
              <Route
                path="/roles"
                element={
                  <RoleGuard roles={["super_admin"]}>
                    <RolesManagement />
                  </RoleGuard>
                }
              />
              <Route
                path="/buildings"
                element={
                  <RoleGuard roles={["super_admin", "owner"]}>
                    <BuildingsManagement />
                  </RoleGuard>
                }
              />
              <Route
                path="/units"
                element={
                  <RoleGuard roles={["super_admin", "owner"]}>
                    <UnitsManagement />
                  </RoleGuard>
                }
              />
              <Route
                path="/amenities"
                element={
                  <RoleGuard roles={["super_admin", "owner"]}>
                    <AmenitiesManagement />
                  </RoleGuard>
                }
              />
              <Route
                path="/profile"
                element={
                  <RoleGuard roles={["owner", "tenant", "super_admin", "regular_user"]}>
                    <Profile />
                  </RoleGuard>
                }
              />
            </Route>
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

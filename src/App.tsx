import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import Login from "./pages/Login";
import MainLayout from "./pages/MainLayout";
import Dashboard from "./pages/Dashboard";
import Finanzas from "./pages/Finanzas";
import Documentos from "./pages/Documentos";
import Reservas from "./pages/Reservas";
import Incidencias from "./pages/Incidencias";
import Aprobaciones from "./pages/Aprobaciones";
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
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardWrapper />} />
            <Route path="/finanzas" element={<Finanzas />} />
            <Route path="/documentos" element={<DocumentosWrapper />} />
            <Route path="/reservas" element={<Reservas />} />
            <Route path="/incidencias" element={<Incidencias />} />
            <Route path="/aprobaciones" element={<Aprobaciones />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

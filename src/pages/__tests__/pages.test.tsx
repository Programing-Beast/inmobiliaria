import { renderWithRouter, renderWithRoutes } from "@/test/utils";
import AdminPanel from "@/pages/AdminPanel";
import AmenitiesManagement from "@/pages/AmenitiesManagement";
import Aprobaciones from "@/pages/Aprobaciones";
import BuildingsManagement from "@/pages/BuildingsManagement";
import Comunicados from "@/pages/Comunicados";
import Dashboard from "@/pages/Dashboard";
import DashboardW3CRM from "@/pages/DashboardW3CRM";
import Documentos from "@/pages/Documentos";
import Finanzas from "@/pages/Finanzas";
import ForgotPassword from "@/pages/ForgotPassword";
import Incidencias from "@/pages/Incidencias";
import Login from "@/pages/Login";
import MainLayout from "@/pages/MainLayout";
import NotFound from "@/pages/NotFound";
import PermissionsManagement from "@/pages/PermissionsManagement";
import Profile from "@/pages/Profile";
import Register from "@/pages/Register";
import Reservas from "@/pages/Reservas";
import ReservationsManagement from "@/pages/ReservationsManagement";
import RolesManagement from "@/pages/RolesManagement";
import UnitsManagement from "@/pages/UnitsManagement";

describe("pages render", () => {
  const cases: Array<{ name: string; element: JSX.Element; useRoutes?: boolean }> = [
    { name: "AdminPanel", element: <AdminPanel /> },
    { name: "AmenitiesManagement", element: <AmenitiesManagement /> },
    { name: "Aprobaciones", element: <Aprobaciones /> },
    { name: "BuildingsManagement", element: <BuildingsManagement /> },
    { name: "Comunicados", element: <Comunicados /> },
    { name: "Dashboard", element: <Dashboard role="owner" /> },
    { name: "DashboardW3CRM", element: <DashboardW3CRM /> },
    { name: "Documentos", element: <Documentos role="Owner" /> },
    { name: "Finanzas", element: <Finanzas /> },
    { name: "ForgotPassword", element: <ForgotPassword /> },
    { name: "Incidencias", element: <Incidencias /> },
    { name: "Login", element: <Login /> },
    { name: "MainLayout", element: <MainLayout />, useRoutes: true },
    { name: "NotFound", element: <NotFound /> },
    { name: "PermissionsManagement", element: <PermissionsManagement /> },
    { name: "Profile", element: <Profile /> },
    { name: "Register", element: <Register /> },
    { name: "Reservas", element: <Reservas /> },
    { name: "ReservationsManagement", element: <ReservationsManagement /> },
    { name: "RolesManagement", element: <RolesManagement /> },
    { name: "UnitsManagement", element: <UnitsManagement /> },
  ];

  cases.forEach(({ name, element, useRoutes }) => {
    it(`renders ${name}`, () => {
      const { container } = useRoutes
        ? renderWithRoutes(element, { path: "/" })
        : renderWithRouter(element);
      expect(container.firstChild).not.toBeNull();
    });
  });
});

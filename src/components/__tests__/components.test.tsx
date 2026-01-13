import { renderWithRouter } from "@/test/utils";
import Header from "@/components/Header";
import NavLink from "@/components/NavLink";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import UnitSwitcher from "@/components/UnitSwitcher";
import SyncQueuePanel from "@/components/SyncQueuePanel";
import { Badge } from "@/components/w3crm/Badge";
import { DataCard } from "@/components/w3crm/DataCard";
import { StatCard } from "@/components/w3crm/StatCard";
import { Users } from "lucide-react";

describe("custom components render", () => {
  it("renders Header", () => {
    const { container } = renderWithRouter(<Header onMenuClick={() => undefined} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders NavLink", () => {
    const { container } = renderWithRouter(<NavLink to="/test">Test</NavLink>, { route: "/test" });
    expect(container.firstChild).not.toBeNull();
  });

  it("renders ProtectedRoute with children", () => {
    const { container, getByText } = renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(getByText("Protected Content")).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });

  it("renders Sidebar", () => {
    const { container } = renderWithRouter(
      <Sidebar isOpen={true} onClose={() => undefined} role="owner" />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders UnitSwitcher", () => {
    const { container } = renderWithRouter(<UnitSwitcher />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders SyncQueuePanel", () => {
    const { container } = renderWithRouter(<SyncQueuePanel />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders W3CRM Badge", () => {
    const { container } = renderWithRouter(<Badge>Test</Badge>);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders W3CRM DataCard", () => {
    const { container } = renderWithRouter(
      <DataCard title="Test">
        <div>Content</div>
      </DataCard>
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders W3CRM StatCard", () => {
    const { container } = renderWithRouter(
      <StatCard title="Test" value="123" icon={Users} />
    );
    expect(container.firstChild).not.toBeNull();
  });
});

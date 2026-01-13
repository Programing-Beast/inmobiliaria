import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/contexts/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("@/contexts/AuthContext")>(
    "@/contexts/AuthContext"
  );
  const authState = {
    user: { id: "user-1", email: "user@example.com" },
    profile: {
      id: "user-1",
      email: "user@example.com",
      full_name: "Test User",
      role: "owner",
      unit_id: "unit-1",
      building_id: "building-1",
      is_active: true,
      currentUnit: {
        unit_id: "unit-1",
        unit_number: "A-101",
        building_id: "building-1",
        building_name: "Building One",
        is_primary: true,
        relationship_type: "owner",
        floor: 1,
        area_sqm: 100,
      },
      units: [],
      roles: ["owner"],
    },
    session: { user: { id: "user-1", email: "user@example.com" } },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    setCurrentUnit: vi.fn(),
  };

  return {
    ...actual,
    useAuth: () => authState,
    AuthProvider: ({ children }: { children: ReactNode }) => children,
  };
});

vi.mock("@/lib/supabase", () => ({
  getAllReservations: vi.fn(async () => ({ reservations: [], error: null })),
  getAllAmenities: vi.fn(async () => ({ amenities: [], error: null })),
  getAllUsersWithRoles: vi.fn(async () => ({ users: [], error: null })),
  getBuildingAmenities: vi.fn(async () => ({ amenities: [], error: null })),
  getUserReservations: vi.fn(async () => ({ reservations: [], error: null })),
  createReservation: vi.fn(async () => ({ reservation: null, error: null })),
  updateReservation: vi.fn(async () => ({ reservation: null, error: null })),
  deleteReservation: vi.fn(async () => ({ error: null })),
  updateReservationStatus: vi.fn(async () => ({ reservation: null, error: null })),
  getAllBuildings: vi.fn(async () => ({ buildings: [], error: null })),
  createBuilding: vi.fn(async () => ({ building: null, error: null })),
  updateBuilding: vi.fn(async () => ({ building: null, error: null })),
  deleteBuilding: vi.fn(async () => ({ error: null })),
  getAllUnits: vi.fn(async () => ({ units: [], error: null })),
  createUnit: vi.fn(async () => ({ unit: null, error: null })),
  updateUnit: vi.fn(async () => ({ unit: null, error: null })),
  deleteUnit: vi.fn(async () => ({ error: null })),
  createAmenity: vi.fn(async () => ({ amenity: null, error: null })),
  updateAmenity: vi.fn(async () => ({ amenity: null, error: null })),
  deleteAmenity: vi.fn(async () => ({ error: null })),
  getBuildingAnnouncements: vi.fn(async () => ({ announcements: [], error: null })),
  getUserPayments: vi.fn(async () => ({ payments: [], error: null })),
  getBuildingPayments: vi.fn(async () => ({ payments: [], error: null })),
  getBuildingDocuments: vi.fn(async () => ({ documents: [], error: null })),
  getAllUsers: vi.fn(async () => ({ users: [], error: null })),
  getAllRoles: vi.fn(async () => ({ roles: [], error: null })),
  getAllPermissions: vi.fn(async () => ({ permissions: [], error: null })),
  getAllRolePermissions: vi.fn(async () => ({ rolePermissions: [], error: null })),
  getAllPermissionsWithRoles: vi.fn(async () => ({ permissions: [], error: null })),
  getRolePermissions: vi.fn(async () => ({ permissions: [], error: null })),
  getUsersWithPermissions: vi.fn(async () => ({ users: [], error: null })),
  getAllRolesWithPermissions: vi.fn(async () => ({ roles: [], error: null })),
  getAllUsersWithRolesAndPermissions: vi.fn(async () => ({ users: [], error: null })),
  getAllPermissionsByRole: vi.fn(async () => ({ permissions: [], error: null })),
  getUserRoles: vi.fn(async () => ({ roles: [], error: null })),
  createUserWithRole: vi.fn(async () => ({ data: { user: { id: "user-2" } }, error: null })),
  createPermission: vi.fn(async () => ({ permission: null, error: null })),
  updatePermission: vi.fn(async () => ({ permission: null, error: null })),
  deletePermission: vi.fn(async () => ({ error: null })),
  assignPermissionToRole: vi.fn(async () => ({ error: null })),
  removePermissionFromRole: vi.fn(async () => ({ error: null })),
  updateUserProfile: vi.fn(async () => ({ error: null })),
  sendPasswordResetEmail: vi.fn(async () => ({ error: null })),
  setUserRoles: vi.fn(async () => ({ error: null })),
  assignRoleToUser: vi.fn(async () => ({ error: null })),
  deleteUser: vi.fn(async () => ({ error: null })),
  getUserProfile: vi.fn(async () => ({ profile: null, error: null })),
  signIn: vi.fn(async () => ({ data: null, error: null })),
  signUp: vi.fn(async () => ({ data: null, error: null })),
  signOut: vi.fn(async () => ({ error: null })),
  supabase: {
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: null, error: null })),
      signUp: vi.fn(async () => ({ data: null, error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ data: null, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  },
}));

vi.mock("@/lib/portal-api", () => ({
  portalGetDashboardIncidents: vi.fn(async () => ({ data: { data: [] }, error: null })),
  portalGetApprovalsReservations: vi.fn(async () => ({ data: { data: [] }, error: null })),
}));

vi.mock("@/lib/portal-sync", () => ({
  getSyncQueue: vi.fn(() => []),
  retrySyncQueue: vi.fn(async () => ({ processed: 0, remaining: 0 })),
  createReservationSynced: vi.fn(async () => ({ reservation: null, error: null, queued: false })),
  createIncidentSynced: vi.fn(async () => ({ incident: null, error: null, queued: false })),
  updateIncidentSynced: vi.fn(async () => ({ incident: null, error: null, queued: false })),
  approveReservationSynced: vi.fn(async () => ({ error: null, queued: false })),
  createAuthUsuarioSynced: vi.fn(async () => ({ error: null, queued: false })),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;
window.scrollTo = vi.fn();
